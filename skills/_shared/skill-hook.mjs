#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import {
  FINAL_REPORT_RELATIVE_PATH,
  RETEST_REPORT_REGEX,
  QA_REPORT_REGEX,
  REVIEW_REPORT_REGEX,
  DESIGN_DIRECTION_RELATIVE_PATH,
  INTAKE_RELATIVE_PATH,
  SPEC_RELATIVE_PATH,
  STATUS_FILE,
  buildReportAdditionalContext,
  getReportValidation,
  resolveProjectRootFromPayload,
} from "../../scripts/harness-report.mjs";

function normalizePath(value) {
  return String(value ?? "").replace(/\\/g, "/");
}

function pathWithinProject(projectRoot, filePath) {
  const absoluteProjectRoot = path.resolve(projectRoot);
  const absoluteFilePath = path.resolve(filePath);
  return absoluteFilePath.startsWith(absoluteProjectRoot);
}

function relativeHarnessPath(projectRoot, filePath) {
  if (!filePath || !pathWithinProject(projectRoot, filePath)) {
    return "";
  }
  return normalizePath(path.relative(projectRoot, filePath));
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
        resolve(input.trim() ? JSON.parse(input) : {});
      } catch {
        resolve({});
      }
    });
    process.stdin.resume();
  });
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function fileExists(projectRoot, relativePath) {
  return fs.existsSync(path.join(projectRoot, relativePath));
}

function matches(relativePath, regex) {
  return regex.test(relativePath);
}

function isHarnessArtifact(relativePath) {
  return relativePath.startsWith(".harness/");
}

function buildPreToolAllowResponse(additionalContext) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
    },
    additionalContext,
  };
}

function buildPreToolDenyResponse(reason) {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  };
}

function buildBlockResponse(reason) {
  return {
    decision: "block",
    reason,
  };
}

function buildOwnedHarnessReason(skillName, relativePath) {
  return `${skillName} may only edit its owned artifact, but attempted to edit ${relativePath}.`;
}

function evaluatePlannerClarifyPreTool(relativePath) {
  const allowed = new Set([INTAKE_RELATIVE_PATH, STATUS_FILE.replace(/\\/g, "/")]);
  if (allowed.has(relativePath)) {
    return buildPreToolAllowResponse(
      [
        "Clarification mode contract:",
        "- Only write .harness/intake.md and .harness/status.md.",
        "- Do not write spec.md or design-direction.md in clarification mode.",
        "- Do not invent clarification answers; unresolved items stay unresolved.",
      ].join("\n"),
    );
  }
  if (isHarnessArtifact(relativePath)) {
    return buildPreToolDenyResponse(buildOwnedHarnessReason("planner-clarify", relativePath));
  }
  return buildPreToolDenyResponse("planner-clarify must not modify application source code.");
}

function evaluatePlannerSpecDraftPreTool(relativePath) {
  const allowed = new Set([
    INTAKE_RELATIVE_PATH,
    STATUS_FILE.replace(/\\/g, "/"),
    SPEC_RELATIVE_PATH,
    DESIGN_DIRECTION_RELATIVE_PATH,
  ]);
  if (allowed.has(relativePath)) {
    return buildPreToolAllowResponse(
      [
        "Spec draft contract:",
        "- Update intake.md first, then write or revise spec.md and design-direction.md.",
        "- Keep status.md mirrored with selected_pack when known.",
        "- Do not write any non-planner artifacts.",
      ].join("\n"),
    );
  }
  if (isHarnessArtifact(relativePath)) {
    return buildPreToolDenyResponse(buildOwnedHarnessReason("planner-spec-draft", relativePath));
  }
  return buildPreToolDenyResponse("planner-spec-draft must not modify application source code.");
}

function evaluateGeneratorPreTool(skillName, relativePath) {
  const forbiddenHarnessPatterns = [
    /^\.harness\/status\.md$/,
    /^\.harness\/intake\.md$/,
    /^\.harness\/spec\.md$/,
    /^\.harness\/design-direction\.md$/,
    REVIEW_REPORT_REGEX,
    QA_REPORT_REGEX,
    RETEST_REPORT_REGEX,
    /^\.harness\/final\/qa-final-report\.md$/,
  ];
  if (forbiddenHarnessPatterns.some((pattern) => matches(relativePath, pattern))) {
    return buildPreToolDenyResponse(
      `${skillName} must not edit orchestrator- or evaluator-owned artifacts such as ${relativePath}.`,
    );
  }
  return buildPreToolAllowResponse(
    [
      `${skillName} contract:`,
      "- You may edit application code and only the generator-owned harness artifacts for this action.",
      "- Never edit status.md, review reports, QA reports, retest reports, or the final report.",
    ].join("\n"),
  );
}

function evaluateEvaluatorPreTool(skillName, relativePath) {
  const allowed = [];
  if (skillName === "evaluator-review-contract") {
    allowed.push(REVIEW_REPORT_REGEX);
  }
  if (skillName === "evaluator-write-qa") {
    allowed.push(QA_REPORT_REGEX);
  }
  if (skillName === "evaluator-write-retest") {
    allowed.push(RETEST_REPORT_REGEX);
  }
  if (skillName === "evaluator-write-final") {
    allowed.push(/^\.harness\/final\/qa-final-report\.md$/);
  }

  if (allowed.some((pattern) => matches(relativePath, pattern))) {
    if (skillName === "evaluator-write-qa") {
      return buildPreToolAllowResponse(buildReportAdditionalContext("qa"));
    }
    if (skillName === "evaluator-write-retest") {
      return buildPreToolAllowResponse(buildReportAdditionalContext("retest"));
    }
    if (skillName === "evaluator-write-final") {
      return buildPreToolAllowResponse(buildReportAdditionalContext("final"));
    }
    return buildPreToolAllowResponse(
      [
        "Contract review mode:",
        "- Only write the sprint review artifact.",
        "- Review must be grounded in named files, not Generator intent.",
      ].join("\n"),
    );
  }

  if (isHarnessArtifact(relativePath)) {
    return buildPreToolDenyResponse(buildOwnedHarnessReason(skillName, relativePath));
  }
  return buildPreToolDenyResponse(`${skillName} must not modify application source code.`);
}

function evaluatePreToolUse(skillName, payload) {
  const projectRoot = resolveProjectRootFromPayload(payload);
  const filePath = payload.tool_input?.file_path;
  if (!filePath) {
    return {};
  }
  const relativePath = relativeHarnessPath(projectRoot, filePath);
  switch (skillName) {
    case "planner-clarify":
      return evaluatePlannerClarifyPreTool(relativePath);
    case "planner-spec-draft":
      return evaluatePlannerSpecDraftPreTool(relativePath);
    case "generator-draft-contract":
    case "generator-build-sprint":
    case "generator-apply-fixes":
      return evaluateGeneratorPreTool(skillName, relativePath);
    case "evaluator-review-contract":
    case "evaluator-write-qa":
    case "evaluator-write-retest":
    case "evaluator-write-final":
      return evaluateEvaluatorPreTool(skillName, relativePath);
    default:
      return {};
  }
}

function evaluatePostToolUse(skillName, payload) {
  const projectRoot = resolveProjectRootFromPayload(payload);
  const filePath = payload.tool_input?.file_path;
  if (!filePath) {
    return {};
  }
  const relativePath = relativeHarnessPath(projectRoot, filePath);
  if (skillName === "evaluator-write-qa" && matches(relativePath, QA_REPORT_REGEX)) {
    const validation = getReportValidation("qa", projectRoot);
    if (!validation.valid) {
      return buildBlockResponse(
        `QA report failed validation. Rewrite the report so it satisfies the bundled rubric files and the schema together. Recompute findings, scores, and verdicts from evidence instead of patching structure only.\n${validation.errors.join("\n")}`,
      );
    }
  }
  if (skillName === "evaluator-write-retest" && matches(relativePath, RETEST_REPORT_REGEX)) {
    const validation = getReportValidation("retest", projectRoot);
    if (!validation.valid) {
      return buildBlockResponse(
        `Retest report failed validation. Rewrite the report so it satisfies the bundled rubric files and the schema together. Recompute outcomes and verdicts from evidence instead of patching structure only.\n${validation.errors.join("\n")}`,
      );
    }
  }
  if (skillName === "evaluator-write-final" && relativePath === FINAL_REPORT_RELATIVE_PATH) {
    const validation = getReportValidation("final", projectRoot);
    if (!validation.valid) {
      return buildBlockResponse(
        `Final report failed validation. Rewrite the report so it satisfies the bundled rubric files and the schema together. Recompute the final assessment from evidence instead of patching structure only.\n${validation.errors.join("\n")}`,
      );
    }
  }
  return {};
}

function plannerClarifyStop(projectRoot) {
  if (!fileExists(projectRoot, INTAKE_RELATIVE_PATH) || !fileExists(projectRoot, STATUS_FILE)) {
    return buildBlockResponse("planner-clarify must produce .harness/intake.md and .harness/status.md before stopping.");
  }
  if (fileExists(projectRoot, SPEC_RELATIVE_PATH) || fileExists(projectRoot, DESIGN_DIRECTION_RELATIVE_PATH)) {
    return buildBlockResponse("planner-clarify must not write spec.md or design-direction.md.");
  }
  return {};
}

function plannerSpecDraftStop(projectRoot) {
  const missing = [];
  if (!fileExists(projectRoot, INTAKE_RELATIVE_PATH)) {
    missing.push(INTAKE_RELATIVE_PATH);
  }
  if (!fileExists(projectRoot, SPEC_RELATIVE_PATH)) {
    missing.push(SPEC_RELATIVE_PATH);
  }
  if (!fileExists(projectRoot, DESIGN_DIRECTION_RELATIVE_PATH)) {
    missing.push(DESIGN_DIRECTION_RELATIVE_PATH);
  }
  if (missing.length > 0) {
    return buildBlockResponse(`planner-spec-draft is incomplete. Missing required outputs: ${missing.join(", ")}`);
  }
  return {};
}

function generatorStop(skillName, projectRoot) {
  if (skillName === "generator-draft-contract") {
    const contractDir = path.join(projectRoot, ".harness", "contracts");
    const contractExists = fs.existsSync(contractDir) && fs.readdirSync(contractDir).some((entry) => /-contract\.md$/i.test(entry));
    if (!contractExists) {
      return buildBlockResponse("generator-draft-contract must produce a sprint contract before stopping.");
    }
  }
  if (skillName === "generator-build-sprint") {
    if (!fileExists(projectRoot, ".harness/runtime.md")) {
      return buildBlockResponse("generator-build-sprint must produce .harness/runtime.md.");
    }
    const qaDir = path.join(projectRoot, ".harness", "qa");
    const selfCheckExists = fs.existsSync(qaDir) && fs.readdirSync(qaDir).some((entry) => /-self-check\.md$/i.test(entry));
    if (!selfCheckExists) {
      return buildBlockResponse("generator-build-sprint must produce a sprint self-check artifact.");
    }
  }
  if (skillName === "generator-apply-fixes") {
    const qaDir = path.join(projectRoot, ".harness", "qa");
    const fixLogExists = fs.existsSync(qaDir) && fs.readdirSync(qaDir).some((entry) => /-fix-log\.md$/i.test(entry));
    if (!fixLogExists) {
      return buildBlockResponse("generator-apply-fixes must produce a sprint fix log.");
    }
  }
  return {};
}

function evaluatorStop(skillName, projectRoot) {
  if (skillName === "evaluator-write-qa") {
    const validation = getReportValidation("qa", projectRoot);
    if (!validation.valid) {
      return buildBlockResponse(
        `QA report is not ready to finalize.\n${validation.errors.join("\n")}`,
      );
    }
  }
  if (skillName === "evaluator-write-retest") {
    const validation = getReportValidation("retest", projectRoot);
    if (!validation.valid) {
      return buildBlockResponse(
        `Retest report is not ready to finalize.\n${validation.errors.join("\n")}`,
      );
    }
  }
  if (skillName === "evaluator-write-final") {
    const validation = getReportValidation("final", projectRoot);
    if (!validation.valid) {
      return buildBlockResponse(
        `Final report is not ready to finalize.\n${validation.errors.join("\n")}`,
      );
    }
  }
  return {};
}

function evaluateStop(skillName, payload) {
  const projectRoot = resolveProjectRootFromPayload(payload);
  switch (skillName) {
    case "planner-clarify":
      return plannerClarifyStop(projectRoot);
    case "planner-spec-draft":
      return plannerSpecDraftStop(projectRoot);
    case "generator-draft-contract":
    case "generator-build-sprint":
    case "generator-apply-fixes":
      return generatorStop(skillName, projectRoot);
    case "evaluator-review-contract":
    case "evaluator-write-qa":
    case "evaluator-write-retest":
    case "evaluator-write-final":
      return evaluatorStop(skillName, projectRoot);
    default:
      return {};
  }
}

const phase = process.argv[2];
const skillName = process.argv[3];
const payload = await readJsonStdin();

let result = {};
if (phase === "pretool") {
  result = evaluatePreToolUse(skillName, payload);
} else if (phase === "posttool") {
  result = evaluatePostToolUse(skillName, payload);
} else if (phase === "stop") {
  result = evaluateStop(skillName, payload);
}

printJson(result);
