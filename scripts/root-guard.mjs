#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import {
  PARALLEL_HARNESS_DIR,
  SERIAL_HARNESS_DIR,
  formatSprintNumber,
  harnessPath,
  readJsonSectionFromMarkdownFile,
  readStatusDocument,
  readStatusParallelState,
  CONTRACT_GRAPH_HEADING,
  validateBuildGraph,
} from "./harness-lib.mjs";

const ACTIVE_AGENT_DIR = path.join(os.tmpdir(), "auto-harness-root-hooks");

const SERIAL_ACTION_AGENT_MAP = new Map([
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

const PARALLEL_ACTION_AGENT_POLICY = new Map([
  [
    "brief_clarification_parallel",
    {
      agents: new Set(["auto-harness:planner-clarify-parallel-agent"]),
      harnessWriters: new Set(["auto-harness:planner-clarify-parallel-agent"]),
    },
  ],
  [
    "spec_draft_parallel",
    {
      agents: new Set(["auto-harness:planner-spec-draft-parallel-agent"]),
      harnessWriters: new Set(["auto-harness:planner-spec-draft-parallel-agent"]),
    },
  ],
  [
    "generator_contract_parallel",
    {
      agents: new Set(["auto-harness:generator-draft-contract-parallel-agent"]),
      harnessWriters: new Set(["auto-harness:generator-draft-contract-parallel-agent"]),
    },
  ],
  [
    "evaluator_review_parallel",
    {
      agents: new Set(["auto-harness:evaluator-review-contract-parallel-agent"]),
      harnessWriters: new Set(["auto-harness:evaluator-review-contract-parallel-agent"]),
    },
  ],
  [
    "generator_build_parallel",
    {
      agents: new Set([
        "auto-harness:generator-build-integrator-agent",
        "auto-harness:generator-build-worker-agent",
      ]),
      harnessWriters: new Set(["auto-harness:generator-build-integrator-agent"]),
      workerAgents: new Set(["auto-harness:generator-build-worker-agent"]),
    },
  ],
  [
    "evaluator_qa_parallel",
    {
      agents: new Set(["auto-harness:evaluator-write-qa-parallel-agent"]),
      harnessWriters: new Set(["auto-harness:evaluator-write-qa-parallel-agent"]),
    },
  ],
  [
    "generator_fix_parallel",
    {
      agents: new Set([
        "auto-harness:generator-fix-integrator-agent",
        "auto-harness:generator-fix-worker-agent",
      ]),
      harnessWriters: new Set(["auto-harness:generator-fix-integrator-agent"]),
      workerAgents: new Set(["auto-harness:generator-fix-worker-agent"]),
    },
  ],
  [
    "evaluator_retest_parallel",
    {
      agents: new Set(["auto-harness:evaluator-write-retest-parallel-agent"]),
      harnessWriters: new Set(["auto-harness:evaluator-write-retest-parallel-agent"]),
    },
  ],
  [
    "evaluator_final_parallel",
    {
      agents: new Set(["auto-harness:evaluator-write-final-parallel-agent"]),
      harnessWriters: new Set(["auto-harness:evaluator-write-final-parallel-agent"]),
    },
  ],
]);

const SHARED_AGENT_NAMES = new Set([
  "auto-harness:planner-clarify-agent",
  "auto-harness:planner-spec-draft-agent",
  "auto-harness:evaluator-write-qa-agent",
  "auto-harness:evaluator-write-retest-agent",
  "auto-harness:evaluator-write-final-agent",
  "auto-harness:qa-report-reviewer-agent",
  "auto-harness:retest-report-reviewer-agent",
  "auto-harness:final-report-reviewer-agent",
]);

const PARALLEL_ONLY_AGENT_NAMES = new Set(
  [...PARALLEL_ACTION_AGENT_POLICY.values()]
    .flatMap((policy) => [...policy.agents])
    .filter((agentName) => !SHARED_AGENT_NAMES.has(agentName)),
);

function normalizePath(value) {
  return String(value ?? "").replace(/\\/g, "/");
}

function normalizeComparablePath(value) {
  return normalizePath(path.resolve(String(value ?? ""))).toLowerCase();
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

function modeForHarnessDir(harnessDir) {
  return harnessDir === PARALLEL_HARNESS_DIR ? "parallel" : "serial";
}

function harnessDirForRelativePath(relativePath) {
  if (relativePath === SERIAL_HARNESS_DIR || relativePath.startsWith(`${SERIAL_HARNESS_DIR}/`)) {
    return SERIAL_HARNESS_DIR;
  }
  if (relativePath === PARALLEL_HARNESS_DIR || relativePath.startsWith(`${PARALLEL_HARNESS_DIR}/`)) {
    return PARALLEL_HARNESS_DIR;
  }
  return null;
}

function harnessDirForAgent(activeAgent, relativePath) {
  const targetHarnessDir = harnessDirForRelativePath(relativePath);
  if (targetHarnessDir) {
    return targetHarnessDir;
  }
  if (PARALLEL_ONLY_AGENT_NAMES.has(activeAgent)) {
    return PARALLEL_HARNESS_DIR;
  }
  return SERIAL_HARNESS_DIR;
}

function isParallelAction(action) {
  return String(action ?? "").endsWith("_parallel");
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

function resolveEffectiveAction(status, activeAgent, harnessDir = SERIAL_HARNESS_DIR) {
  const pendingAction = status?.frontmatter?.pending_action;
  // Planner spec drafting is dispatched while status is still in the approval-oriented planner lane.
  if (
    activeAgent === "auto-harness:planner-spec-draft-agent" &&
    ["brief_clarification", "spec_approval", "spec_draft"].includes(String(pendingAction ?? ""))
  ) {
    return "spec_draft";
  }
  if (
    activeAgent === "auto-harness:planner-spec-draft-parallel-agent" &&
    ["brief_clarification_parallel", "spec_approval_parallel", "spec_draft_parallel"].includes(
      String(pendingAction ?? ""),
    )
  ) {
    return "spec_draft_parallel";
  }
  if (pendingAction === "brief_clarification") {
    return "brief_clarification";
  }
  if (pendingAction === "brief_clarification_parallel") {
    return "brief_clarification_parallel";
  }
  if (
    SERIAL_ACTION_AGENT_MAP.has(String(pendingAction ?? "")) ||
    PARALLEL_ACTION_AGENT_POLICY.has(String(pendingAction ?? ""))
  ) {
    return String(pendingAction);
  }
  if (!status && activeAgent === "auto-harness:planner-clarify-agent") {
    return "brief_clarification";
  }
  if (!status && activeAgent === "auto-harness:planner-clarify-parallel-agent") {
    return "brief_clarification_parallel";
  }
  return null;
}

function normalizeParallelNode(rawNode) {
  return {
    id: String(rawNode?.id ?? "").trim(),
    title: String(rawNode?.title ?? "").trim(),
    goal: String(rawNode?.goal ?? "").trim(),
    owned_paths: Array.isArray(rawNode?.owned_paths)
      ? rawNode.owned_paths.map((value) => String(value).trim()).filter(Boolean)
      : [],
    depends_on: Array.isArray(rawNode?.depends_on)
      ? rawNode.depends_on.map((value) => String(value).trim()).filter(Boolean)
      : [],
    behavior_ids: Array.isArray(rawNode?.behavior_ids)
      ? rawNode.behavior_ids.map((value) => String(value).trim()).filter(Boolean)
      : [],
    bug_ids: Array.isArray(rawNode?.bug_ids)
      ? rawNode.bug_ids.map((value) => String(value).trim()).filter(Boolean)
      : [],
    priority: rawNode?.priority == null ? null : String(rawNode.priority).trim(),
    notes: String(rawNode?.notes ?? "").trim(),
  };
}

function readParallelNodes(projectRoot, parallelState, harnessDir = PARALLEL_HARNESS_DIR) {
  if (Array.isArray(parallelState?.node_definitions) && parallelState.node_definitions.length) {
    return parallelState.node_definitions.map(normalizeParallelNode);
  }
  if (!parallelState?.graph_source) {
    return [];
  }
  const absolutePath = path.resolve(projectRoot, parallelState.graph_source);
  if (absolutePath.includes(`${path.sep}${harnessDir}${path.sep}qa${path.sep}`)) {
    return [];
  }
  const data = readJsonSectionFromMarkdownFile(absolutePath, CONTRACT_GRAPH_HEADING);
  const validation = validateBuildGraph(data);
  return validation.errors.length === 0 ? validation.nodes : [];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesOwnedPath(relativePath, ownedPattern) {
  const normalizedPath = normalizePath(relativePath);
  const normalizedPattern = normalizePath(ownedPattern);
  if (!normalizedPattern) {
    return false;
  }
  if (!/[?*[{]/.test(normalizedPattern)) {
    const literalPattern = normalizedPattern.replace(/\/+$/, "");
    return normalizedPath === literalPattern || normalizedPath.startsWith(`${literalPattern}/`);
  }
  const regex = new RegExp(
    `^${escapeRegExp(normalizedPattern)
      .replace(/\\\*\\\*/g, ".*")
      .replace(/\\\*/g, "[^/]*")
      .replace(/\\\?/g, "[^/]")}$`,
  );
  return regex.test(normalizedPath);
}

function resolveWorkerNode(projectRoot, parallelState, activeAgent) {
  if (!parallelState) {
    return null;
  }
  const policy = PARALLEL_ACTION_AGENT_POLICY.get(parallelState.mode || "");
  if (!policy?.workerAgents?.has(activeAgent)) {
    return null;
  }
  const currentPath = normalizeComparablePath(projectRoot);
  const match = (parallelState.worktrees ?? []).find(
    (entry) => normalizeComparablePath(entry.path) === currentPath,
  );
  return match ? match.node_id : null;
}

function allParallelNodesMerged(projectRoot, parallelState, harnessDir = PARALLEL_HARNESS_DIR) {
  const nodes = readParallelNodes(projectRoot, parallelState, harnessDir);
  if (!nodes.length) {
    return false;
  }
  return nodes.every((node) => parallelState.nodes?.[node.id] === "merged");
}

function allowedRelativePathsForParallelAction(action, sprint, activeAgent, projectRoot, parallelState, harnessDir) {
  const policy = PARALLEL_ACTION_AGENT_POLICY.get(action);
  const canWriteHarness = Boolean(policy?.harnessWriters?.has(activeAgent));
  switch (action) {
    case "brief_clarification_parallel":
      return new Set([harnessPath(harnessDir, "intake.md"), harnessPath(harnessDir, "status.md")]);
    case "spec_draft_parallel":
      return new Set([
        harnessPath(harnessDir, "intake.md"),
        harnessPath(harnessDir, "status.md"),
        harnessPath(harnessDir, "spec.md"),
        harnessPath(harnessDir, "design-direction.md"),
      ]);
    case "generator_contract_parallel":
      return new Set([harnessPath(harnessDir, "contracts", `sprint-${sprint}-contract.md`)]);
    case "generator_build_parallel":
      return canWriteHarness && allParallelNodesMerged(projectRoot, parallelState, harnessDir)
        ? new Set([
            harnessPath(harnessDir, "runtime.md"),
            harnessPath(harnessDir, "qa", `sprint-${sprint}-self-check.md`),
          ])
        : new Set();
    case "generator_fix_parallel":
      return canWriteHarness && allParallelNodesMerged(projectRoot, parallelState, harnessDir)
        ? new Set([
            harnessPath(harnessDir, "runtime.md"),
            harnessPath(harnessDir, "qa", `sprint-${sprint}-fix-log.md`),
          ])
        : new Set();
    case "evaluator_review_parallel":
      return new Set([harnessPath(harnessDir, "contracts", `sprint-${sprint}-review.md`)]);
    case "evaluator_qa_parallel":
      return new Set([harnessPath(harnessDir, "qa", `sprint-${sprint}-qa-report.md`)]);
    case "evaluator_retest_parallel":
      return new Set([harnessPath(harnessDir, "qa", `sprint-${sprint}-retest.md`)]);
    case "evaluator_final_parallel":
      return new Set([harnessPath(harnessDir, "final", "qa-final-report.md")]);
    default:
      return new Set();
  }
}

function allowedRelativePathsForSerialAction(action, sprint, harnessDir = SERIAL_HARNESS_DIR) {
  switch (action) {
    case "brief_clarification":
      return new Set([harnessPath(harnessDir, "intake.md"), harnessPath(harnessDir, "status.md")]);
    case "spec_draft":
      return new Set([
        harnessPath(harnessDir, "intake.md"),
        harnessPath(harnessDir, "status.md"),
        harnessPath(harnessDir, "spec.md"),
        harnessPath(harnessDir, "design-direction.md"),
      ]);
    case "generator_contract":
      return new Set([harnessPath(harnessDir, "contracts", `sprint-${sprint}-contract.md`)]);
    case "generator_build":
      return new Set([
        harnessPath(harnessDir, "runtime.md"),
        harnessPath(harnessDir, "qa", `sprint-${sprint}-self-check.md`),
      ]);
    case "generator_fix":
      return new Set([
        harnessPath(harnessDir, "runtime.md"),
        harnessPath(harnessDir, "qa", `sprint-${sprint}-fix-log.md`),
      ]);
    case "evaluator_review":
      return new Set([harnessPath(harnessDir, "contracts", `sprint-${sprint}-review.md`)]);
    case "evaluator_qa":
      return new Set([harnessPath(harnessDir, "qa", `sprint-${sprint}-qa-report.md`)]);
    case "evaluator_retest":
      return new Set([harnessPath(harnessDir, "qa", `sprint-${sprint}-retest.md`)]);
    case "evaluator_final":
      return new Set([harnessPath(harnessDir, "final", "qa-final-report.md")]);
    default:
      return new Set();
  }
}

function isRepoHarnessFile(relativePath) {
  return Boolean(harnessDirForRelativePath(relativePath));
}

function allowedMainThreadPaths() {
  return new Set([
    harnessPath(SERIAL_HARNESS_DIR, "status.md"),
    harnessPath(SERIAL_HARNESS_DIR, "checkpoints", "latest.md"),
    harnessPath(PARALLEL_HARNESS_DIR, "status.md"),
    harnessPath(PARALLEL_HARNESS_DIR, "checkpoints", "latest.md"),
  ].map(normalizePath));
}

function allowedPathSetHas(allowedPaths, relativePath) {
  const normalizedRelativePath = normalizePath(relativePath);
  return [...allowedPaths].some((allowedPath) => normalizePath(allowedPath) === normalizedRelativePath);
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
  if (!isRepoHarnessFile(relativePath)) {
    allow();
  }
  if (allowedMainThreadPaths().has(relativePath)) {
    allow();
  }
  deny(
    `Auto-Harness blocked repo write to ${relativePath}: the main thread may not edit harness artifacts other than status.md or checkpoints/latest.md.`,
  );
}

const harnessDir = harnessDirForAgent(activeAgent, relativePath);
const status = readStatusDocument(projectRoot, harnessDir);
const effectiveAction = resolveEffectiveAction(status, activeAgent, harnessDir);
if (!effectiveAction) {
  deny(`Auto-Harness blocked repo write to ${relativePath}: pending_action does not authorize any writer action.`);
}

const workflowMode = modeForHarnessDir(harnessDir);
if (isParallelAction(effectiveAction)) {
  const policy = PARALLEL_ACTION_AGENT_POLICY.get(effectiveAction);
  if (policy && !policy.agents.has(activeAgent)) {
    deny(
      `Auto-Harness blocked repo write to ${relativePath}: active subagent ${activeAgent} does not match pending_action=${effectiveAction}.`,
    );
  }
} else {
  const expectedAgent = SERIAL_ACTION_AGENT_MAP.get(effectiveAction);
  if (expectedAgent && activeAgent !== expectedAgent) {
    deny(
      `Auto-Harness blocked repo write to ${relativePath}: active subagent ${activeAgent} does not match pending_action=${effectiveAction}.`,
    );
  }
}

const parallelState = readStatusParallelState(projectRoot, harnessDir);
const parallelPolicy = isParallelAction(effectiveAction)
  ? PARALLEL_ACTION_AGENT_POLICY.get(effectiveAction)
  : null;
const isParallelWorker = Boolean(parallelPolicy?.workerAgents?.has(activeAgent));
const workerNodeId = isParallelWorker
  ? resolveWorkerNode(projectRoot, parallelState, activeAgent)
  : null;
if (isParallelWorker && !workerNodeId) {
  deny(
    `Auto-Harness blocked repo write to ${relativePath}: parallel worker ${activeAgent} is not registered for this worktree.`,
  );
}
if (workerNodeId) {
  if (isRepoHarnessFile(relativePath)) {
    deny(`Auto-Harness blocked repo write to ${relativePath}: worker agents may not modify harness snapshots.`);
  }
  const nodes = readParallelNodes(projectRoot, parallelState, harnessDir);
  const node = nodes.find((entry) => entry.id === workerNodeId);
  if (!node) {
    deny(`Auto-Harness blocked repo write to ${relativePath}: worker node metadata for ${workerNodeId} is missing.`);
  }
  if (
    parallelState?.mode === "generator_fix_parallel" &&
    activeAgent === "auto-harness:generator-fix-worker-agent" &&
    !(node.owned_paths ?? []).length
  ) {
    allow();
  }
  if (node.owned_paths.some((ownedPath) => matchesOwnedPath(relativePath, ownedPath))) {
    allow();
  }
  deny(
    `Auto-Harness blocked repo write to ${relativePath}: worker node ${workerNodeId} may only modify its owned_paths.`,
  );
}

if (
  ["generator_build", "generator_fix", "generator_build_parallel", "generator_fix_parallel"].includes(
    effectiveAction,
  ) &&
  !isRepoHarnessFile(relativePath)
) {
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
    "generator_contract_parallel",
    "generator_build_parallel",
    "generator_fix_parallel",
    "evaluator_review_parallel",
    "evaluator_qa_parallel",
    "evaluator_retest_parallel",
  ].includes(effectiveAction)
) {
  sprint = requireSprint(status);
  if (!sprint) {
    deny(`Auto-Harness blocked repo write to ${relativePath}: current_sprint is missing or invalid for ${effectiveAction}.`);
  }
}

const allowedPaths = workflowMode === "parallel"
  ? allowedRelativePathsForParallelAction(
      effectiveAction,
      sprint,
      activeAgent,
      projectRoot,
      parallelState,
      harnessDir,
    )
  : allowedRelativePathsForSerialAction(effectiveAction, sprint, harnessDir);
if (allowedPathSetHas(allowedPaths, relativePath)) {
  allow();
}

deny(`Auto-Harness blocked repo write to ${relativePath}: pending_action=${effectiveAction} does not own this file.`);
