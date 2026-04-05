#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { formatSprintNumber, readStatusDocument } from "./harness-lib.mjs";

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fail(action, reason, details = {}) {
  printJson({ ok: false, action, reason, ...details });
  process.exit(1);
}

function succeed(action, details = {}) {
  printJson({ ok: true, action, ...details });
  process.exit(0);
}

function fileExists(projectRoot, relativePath) {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

function readFile(projectRoot, relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function resolveSprint(status, action) {
  const value = status?.frontmatter?.current_sprint;
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    fail(action, "current_sprint is missing or invalid in .harness/status.md.");
  }
  return formatSprintNumber(parsed);
}

const action = process.argv[2];
const projectRoot = path.resolve(process.argv[3] || process.cwd());
const status = readStatusDocument(projectRoot);

if (!action) {
  fail("unknown", "Usage: action-check.mjs <action> [projectRoot]");
}

if (action === "planner_clarify") {
  const missing = [];
  if (!fileExists(projectRoot, ".harness/intake.md")) {
    missing.push(".harness/intake.md");
  }
  if (!fileExists(projectRoot, ".harness/status.md")) {
    missing.push(".harness/status.md");
  }
  if (missing.length > 0) {
    fail(action, "planner_clarify outputs are incomplete.", { missing });
  }
  const forbidden = [];
  if (fileExists(projectRoot, ".harness/spec.md")) {
    forbidden.push(".harness/spec.md");
  }
  if (fileExists(projectRoot, ".harness/design-direction.md")) {
    forbidden.push(".harness/design-direction.md");
  }
  if (forbidden.length > 0) {
    fail(action, "planner_clarify created planner outputs that should not exist yet.", { forbidden });
  }
  succeed(action);
}

if (action === "planner_spec_draft") {
  const missing = [];
  for (const relativePath of [
    ".harness/intake.md",
    ".harness/spec.md",
    ".harness/design-direction.md",
  ]) {
    if (!fileExists(projectRoot, relativePath)) {
      missing.push(relativePath);
    }
  }
  if (missing.length > 0) {
    fail(action, "planner_spec_draft outputs are incomplete.", { missing });
  }
  succeed(action);
}

if (!status) {
  fail(action, ".harness/status.md does not exist.");
}

if (action === "generator_contract") {
  const sprint = resolveSprint(status, action);
  const relativePath = `.harness/contracts/sprint-${sprint}-contract.md`;
  if (!fileExists(projectRoot, relativePath)) {
    fail(action, "generator_contract did not produce the current sprint contract.", { missing: [relativePath] });
  }
  succeed(action, { sprint, requiredPath: relativePath });
}

if (action === "generator_build") {
  const sprint = resolveSprint(status, action);
  const missing = [];
  const required = [
    ".harness/runtime.md",
    `.harness/qa/sprint-${sprint}-self-check.md`,
  ];
  for (const relativePath of required) {
    if (!fileExists(projectRoot, relativePath)) {
      missing.push(relativePath);
    }
  }
  if (missing.length > 0) {
    fail(action, "generator_build outputs are incomplete.", { sprint, missing });
  }
  succeed(action, { sprint, required });
}

if (action === "generator_fix") {
  const sprint = resolveSprint(status, action);
  const relativePath = `.harness/qa/sprint-${sprint}-fix-log.md`;
  if (!fileExists(projectRoot, relativePath)) {
    fail(action, "generator_fix did not produce the current sprint fix log.", { sprint, missing: [relativePath] });
  }
  succeed(action, { sprint, requiredPath: relativePath });
}

if (action === "evaluator_review") {
  const sprint = resolveSprint(status, action);
  const relativePath = `.harness/contracts/sprint-${sprint}-review.md`;
  if (!fileExists(projectRoot, relativePath)) {
    fail(action, "evaluator_review did not produce the current sprint review.", { sprint, missing: [relativePath] });
  }
  const text = readFile(projectRoot, relativePath);
  const match = text.match(/^Result:\s*(APPROVED|REVISE)\s*$/m);
  if (!match) {
    fail(action, "evaluator_review output is missing an explicit Result: APPROVED or Result: REVISE line.", {
      sprint,
      file: relativePath,
    });
  }
  succeed(action, { sprint, requiredPath: relativePath, result: match[1] });
}

fail(action, `Unknown action check: ${action}`);
