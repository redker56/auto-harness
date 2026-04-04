#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { formatSprintNumber, readStatusDocument } from "./harness-lib.mjs";

function usage() {
  console.error(
    "Usage: harness-report.mjs qa <validate|result|path> [projectRoot] [sprint]",
  );
  process.exit(1);
}

function resolveProjectRoot(rawValue) {
  if (!rawValue || rawValue.startsWith("--")) {
    return process.cwd();
  }
  return path.resolve(rawValue);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function resolveSprint(projectRoot, rawSprint) {
  if (rawSprint) {
    return formatSprintNumber(rawSprint);
  }
  const status = readStatusDocument(projectRoot);
  return formatSprintNumber(status?.frontmatter.current_sprint);
}

function qaReportPath(projectRoot, sprint) {
  return path.join(projectRoot, ".harness", "qa", `sprint-${sprint}-qa-report.md`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(text, heading) {
  const pattern = new RegExp(
    `^## ${escapeRegex(heading)}\\s*$([\\s\\S]*?)(?=^##\\s|\\Z)`,
    "m",
  );
  const match = text.match(pattern);
  return match?.[1] ?? "";
}

function validateQaReport(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      valid: false,
      errors: [`QA report not found: ${filePath}`],
      result: null,
    };
  }

  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const errors = [];
  const requiredPatterns = [
    { label: "Result line", pattern: /^Result:\s*(PASS|FAIL)\s*$/m },
    { label: "Primary Path Exercise section", pattern: /^## Primary Path Exercise\s*$/m },
    { label: "Primary Path Flow bullet", pattern: /^- Flow:\s*.+$/m },
    { label: "Primary Path Result bullet", pattern: /^- Result:\s*.+$/m },
    { label: "Primary Path Evidence bullet", pattern: /^- Evidence:\s*.+$/m },
    { label: "Contract Behaviors section", pattern: /^## Contract Behaviors\s*$/m },
    { label: "Contract Behaviors table", pattern: /^\| # \| Behavior \| Result \| Evidence \|\s*$/m },
    { label: "Bugs section", pattern: /^## Bugs\s*$/m },
    { label: "Bugs table", pattern: /^\| Bug ID \| Severity \| Summary \| Reproduction \| Notes \|\s*$/m },
    { label: "Hard-Fail Gates section", pattern: /^## Hard-Fail Gates\s*$/m },
    { label: "Hard-Fail Gates table", pattern: /^\| Gate \| Status \| Evidence \|\s*$/m },
    { label: "Scorecard section", pattern: /^## Scorecard\s*$/m },
    { label: "Scorecard table", pattern: /^\| Dimension \| Score \| Threshold \| Pass\? \| Notes \|\s*$/m },
    { label: "Verdict section", pattern: /^## Verdict\s*$/m },
  ];

  for (const { label, pattern } of requiredPatterns) {
    if (!pattern.test(text)) {
      errors.push(`Missing or malformed ${label}.`);
    }
  }

  for (const row of [
    "Product depth",
    "Functional correctness",
    "Visual design",
    "Code quality",
  ]) {
    const rowPattern = new RegExp(`^\\|\\s*${escapeRegex(row)}\\s*\\|`, "m");
    if (!rowPattern.test(text)) {
      errors.push(`Missing Scorecard row for ${row}.`);
    }
  }

  const hardFailSection = extractSection(text, "Hard-Fail Gates");
  const hardFailRows = hardFailSection.match(
    /^\|\s*[^|\n]+\s*\|\s*(?:PASS|FAIL)\s*\|\s*.*\|\s*$/gm,
  ) ?? [];
  if (/^## Hard-Fail Gates\s*$/m.test(text) && hardFailRows.length === 0) {
    errors.push("Hard-Fail Gates table has no PASS/FAIL rows.");
  }

  const resultMatch = text.match(/^Result:\s*(PASS|FAIL)\s*$/m);
  return {
    exists: true,
    valid: errors.length === 0,
    errors,
    result: resultMatch?.[1] ?? null,
  };
}

const reportType = process.argv[2];
const command = process.argv[3];

if (!reportType || !command) {
  usage();
}

if (reportType !== "qa") {
  console.error(`Unsupported report type: ${reportType}`);
  process.exit(1);
}

const projectRoot = resolveProjectRoot(process.argv[4]);
const sprint = resolveSprint(projectRoot, process.argv[5]);
const filePath = qaReportPath(projectRoot, sprint);
const validation = validateQaReport(filePath);

if (command === "path") {
  printJson({ reportType, projectRoot, sprint, filePath });
  process.exit(0);
}

if (command === "validate") {
  printJson({ reportType, projectRoot, sprint, filePath, ...validation });
  process.exit(validation.valid ? 0 : 1);
}

if (command === "result") {
  if (!validation.valid || !validation.result) {
    printJson({ reportType, projectRoot, sprint, filePath, ...validation });
    process.exit(1);
  }
  printJson({ reportType, projectRoot, sprint, filePath, result: validation.result });
  process.exit(0);
}

usage();
