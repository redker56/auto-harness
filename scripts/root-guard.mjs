#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { formatSprintNumber, readStatusDocument } from "./harness-lib.mjs";

const ACTIVE_AGENT_DIR = path.join(os.tmpdir(), "auto-harness-root-hooks");

const ACTION_AGENT_MAP = new Map([
  ["brief_clarification", "auto-harness:planner-clarify-agent"],
  ["spec_draft", "auto-harness:planner-spec-draft-agent"],
  ["generator_contract", "auto-harness:generator-draft-contract-agent"],
  ["evaluator_review", "auto-harness:evaluator-review-contract-agent"],
  ["generator_build", "auto-harness:generator-build-sprint-agent"],
  ["evaluator_qa", "auto-harness:evaluator-write-qa-agent"],
  ["generator_fix", "auto-harness:generator-apply-fixes-agent"],
  ["evaluator_retest", "auto-harness:evaluator-write-retest-agent"],
  ["evaluator_final", "auto-harness:evaluator-write-final-agent"],
]);

function normalizePath(value) {
  return String(value ?? "").replace(/\\/g, "/");
}

function readJsonStdin() {
  return new Promise((resolve) => {
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      input += chunk;
    });
    process.stdin.on("end", () => {
      try {
        const normalized = input.replace(/^\uFEFF/, "").trim();
        resolve(normalized ? JSON.parse(normalized) : {});
      } catch {
        resolve({});
      }
    });
    process.stdin.resume();
  });
}

function resolveProjectRoot(payload) {
  return path.resolve(payload?.cwd || process.cwd());
}

function resolveSidecarPath(sessionId) {
  return path.join(ACTIVE_AGENT_DIR, `${sessionId}.json`);
}

function writeActiveAgentState(sessionId, projectRoot, agentName) {
  fs.mkdirSync(ACTIVE_AGENT_DIR, { recursive: true });
  fs.writeFileSync(
    resolveSidecarPath(sessionId),
    JSON.stringify(
      {
        sessionId,
        projectRoot,
        agentName,
        updatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );
}

function readActiveAgentState(sessionId) {
  if (!sessionId) {
    return null;
  }
  const sidecarPath = resolveSidecarPath(sessionId);
  if (!fs.existsSync(sidecarPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
  } catch {
    return null;
  }
}

function clearActiveAgentState(sessionId, agentName) {
  if (!sessionId) {
    return;
  }
  const sidecarPath = resolveSidecarPath(sessionId);
  if (!fs.existsSync(sidecarPath)) {
    return;
  }
  const current = readActiveAgentState(sessionId);
  if (!current || !agentName || current.agentName === agentName) {
    fs.rmSync(sidecarPath, { force: true });
  }
}

function isWithinProject(projectRoot, filePath) {
  const root = path.resolve(projectRoot);
  const target = path.resolve(filePath);
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function relativeProjectPath(projectRoot, filePath) {
  return normalizePath(path.relative(projectRoot, filePath));
}

function resolveTargetFilePath(projectRoot, payload) {
  const rawPath = payload?.tool_input?.file_path;
  if (!rawPath) {
    return null;
  }
  return path.isAbsolute(rawPath) ? rawPath : path.join(projectRoot, rawPath);
}

function deny(reason) {
  process.stderr.write(`${reason}\n`);
  process.exit(2);
}

function allow() {
  process.exit(0);
}

function requireSprint(status) {
  const value = status?.frontmatter?.current_sprint;
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return null;
  }
  return formatSprintNumber(parsed);
}

function resolveEffectiveAction(status, activeAgent) {
  const pendingAction = status?.frontmatter?.pending_action;
  if (pendingAction === "brief_clarification") {
    return "brief_clarification";
  }
  // Planner spec drafting is dispatched while status is still in the approval-oriented planner lane.
  if (
    activeAgent === "auto-harness:planner-spec-draft-agent" &&
    ["brief_clarification", "spec_approval", "spec_draft"].includes(String(pendingAction ?? ""))
  ) {
    return "spec_draft";
  }
  if (ACTION_AGENT_MAP.has(String(pendingAction ?? ""))) {
    return String(pendingAction);
  }
  if (!status && activeAgent === "auto-harness:planner-clarify-agent") {
    return "brief_clarification";
  }
  return null;
}

function allowedRelativePathsForAction(action, sprint) {
  switch (action) {
    case "brief_clarification":
      return new Set([".harness/intake.md", ".harness/status.md"]);
    case "spec_draft":
      return new Set([
        ".harness/intake.md",
        ".harness/status.md",
        ".harness/spec.md",
        ".harness/design-direction.md",
      ]);
    case "generator_contract":
      return new Set([`.harness/contracts/sprint-${sprint}-contract.md`]);
    case "generator_build":
      return new Set([
        ".harness/runtime.md",
        `.harness/qa/sprint-${sprint}-self-check.md`,
      ]);
    case "generator_fix":
      return new Set([
        ".harness/runtime.md",
        `.harness/qa/sprint-${sprint}-fix-log.md`,
      ]);
    case "evaluator_review":
      return new Set([`.harness/contracts/sprint-${sprint}-review.md`]);
    case "evaluator_qa":
      return new Set([`.harness/qa/sprint-${sprint}-qa-report.md`]);
    case "evaluator_retest":
      return new Set([`.harness/qa/sprint-${sprint}-retest.md`]);
    case "evaluator_final":
      return new Set([".harness/final/qa-final-report.md"]);
    default:
      return new Set();
  }
}

function isRepoHarnessFile(relativePath) {
  return relativePath.startsWith(".harness/");
}

function allowedMainThreadPaths() {
  return new Set([".harness/status.md", ".harness/checkpoints/latest.md"]);
}

const mode = process.argv[2];
const fixedAgentName = process.argv[3];
const payload = await readJsonStdin();
const sessionId = payload?.session_id || "";
const projectRoot = resolveProjectRoot(payload);

if (mode === "subagent-start") {
  if (sessionId && fixedAgentName) {
    writeActiveAgentState(sessionId, projectRoot, fixedAgentName);
  }
  allow();
}

if (mode === "subagent-stop") {
  clearActiveAgentState(sessionId, fixedAgentName);
  allow();
}

if (mode !== "pretool") {
  allow();
}

const activeState = readActiveAgentState(sessionId);
const activeAgent = activeState?.agentName || "";
const targetFilePath = resolveTargetFilePath(projectRoot, payload);
if (!targetFilePath || !isWithinProject(projectRoot, targetFilePath)) {
  allow();
}

const relativePath = relativeProjectPath(projectRoot, targetFilePath);
if (!activeAgent) {
  if (allowedMainThreadPaths().has(relativePath)) {
    allow();
  }
  deny(
    `Auto-Harness blocked repo write to ${relativePath}: the main thread may only edit .harness/status.md or .harness/checkpoints/latest.md.`,
  );
}

const status = readStatusDocument(projectRoot);
const effectiveAction = resolveEffectiveAction(status, activeAgent);
if (!effectiveAction) {
  deny(`Auto-Harness blocked repo write to ${relativePath}: pending_action does not authorize any writer action.`);
}

const expectedAgent = ACTION_AGENT_MAP.get(effectiveAction);
if (expectedAgent && activeAgent !== expectedAgent) {
  deny(
    `Auto-Harness blocked repo write to ${relativePath}: active subagent ${activeAgent} does not match pending_action=${effectiveAction}.`,
  );
}

if (["generator_build", "generator_fix"].includes(effectiveAction) && !isRepoHarnessFile(relativePath)) {
  allow();
}

let sprint = null;
if (
  [
    "generator_contract",
    "generator_build",
    "generator_fix",
    "evaluator_review",
    "evaluator_qa",
    "evaluator_retest",
  ].includes(effectiveAction)
) {
  sprint = requireSprint(status);
  if (!sprint) {
    deny(`Auto-Harness blocked repo write to ${relativePath}: current_sprint is missing or invalid for ${effectiveAction}.`);
  }
}

const allowedPaths = allowedRelativePathsForAction(effectiveAction, sprint);
if (allowedPaths.has(relativePath)) {
  allow();
}

deny(`Auto-Harness blocked repo write to ${relativePath}: pending_action=${effectiveAction} does not own this file.`);
