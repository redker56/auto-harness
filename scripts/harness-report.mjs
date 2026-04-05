#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatSprintNumber,
  readMarkdownDocument,
  readStatusDocument,
} from "./harness-lib.mjs";

export const INTAKE_RELATIVE_PATH = ".harness/intake.md";
export const SPEC_RELATIVE_PATH = ".harness/spec.md";
export const DESIGN_DIRECTION_RELATIVE_PATH = ".harness/design-direction.md";
export const STATUS_FILE = ".harness/status.md";
export const QA_REPORT_REGEX = /^\.harness\/qa\/sprint-\d{2}-qa-report\.md$/;
export const RETEST_REPORT_REGEX = /^\.harness\/qa\/sprint-\d{2}-retest\.md$/;
export const REVIEW_REPORT_REGEX = /^\.harness\/contracts\/sprint-\d{2}-review\.md$/;
export const FINAL_REPORT_RELATIVE_PATH = ".harness/final/qa-final-report.md";

const REPORT_REFERENCE_CONFIG = {
  qa: {
    skillName: "evaluator-write-qa",
    templateRelativePath: path.join("templates", "qa-report.md"),
    gradingRubricRelativePath: path.join("rubrics", "default-grading.md"),
  },
  retest: {
    skillName: "evaluator-write-retest",
    templateRelativePath: path.join("templates", "retest-report.md"),
    gradingRubricRelativePath: path.join("rubrics", "default-grading.md"),
  },
  final: {
    skillName: "evaluator-write-final",
    templateRelativePath: path.join("templates", "final-report.md"),
    gradingRubricRelativePath: path.join("rubrics", "default-grading.md"),
  },
};

function usage() {
  console.error(
    "Usage: harness-report.mjs <qa|retest|final> <validate|result|path> [projectRoot] [sprint]",
  );
  process.exit(1);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function resolveProjectRootFromPayload(payload) {
  return path.resolve(payload?.cwd || process.cwd());
}

function resolveProjectRoot(rawValue) {
  if (!rawValue || rawValue.startsWith("--")) {
    return process.cwd();
  }
  return path.resolve(rawValue);
}

function resolveSprint(projectRoot, rawSprint) {
  if (rawSprint) {
    return formatSprintNumber(rawSprint);
  }
  const status = readStatusDocument(projectRoot);
  return formatSprintNumber(status?.frontmatter.current_sprint);
}

function reportPath(reportType, projectRoot, sprint) {
  if (reportType === "qa") {
    return path.join(projectRoot, ".harness", "qa", `sprint-${sprint}-qa-report.md`);
  }
  if (reportType === "retest") {
    return path.join(projectRoot, ".harness", "qa", `sprint-${sprint}-retest.md`);
  }
  if (reportType === "final") {
    return path.join(projectRoot, FINAL_REPORT_RELATIVE_PATH);
  }
  throw new Error(`Unsupported report type: ${reportType}`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeInlineCodeRegex(value) {
  return value.replace(/[`.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractSection(text, heading) {
  const pattern = new RegExp(`^## ${escapeRegex(heading)}\\s*$([\\s\\S]*?)(?=^##\\s|\\Z)`, "m");
  const match = text.match(pattern);
  return match?.[1] ?? "";
}

function parseMarkdownTable(sectionText) {
  const rows = sectionText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"));
  if (rows.length < 2) {
    return [];
  }
  return rows
    .slice(2)
    .map((line) => parseTableCells(line))
    .filter((cells) => cells.length > 0 && cells.some(Boolean));
}

function parseNumber(value) {
  const numeric = Number.parseFloat(String(value).trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function parseTableCells(line) {
  return line
    .trim()
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function isTableSeparatorRow(cells) {
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, "")))
  );
}

function extractMarkdownCodeBlock(markdownText) {
  const match = markdownText.match(/```(?:md)?\r?\n([\s\S]*?)```/m);
  return match?.[1] ?? "";
}

function parseBulletRule(content) {
  const match = content.match(/^([A-Za-z][A-Za-z0-9 /&()?#-]*):\s+/);
  if (match) {
    return { type: "label", label: match[1].trim() };
  }
  return { type: "bullet" };
}

function parseTemplateSchema(templateText) {
  const codeBlock = extractMarkdownCodeBlock(templateText);
  if (!codeBlock) {
    return {
      requiresResultLine: false,
      sections: [],
      errors: ["Template is missing a fenced markdown code block."],
    };
  }

  const lines = codeBlock.split(/\r?\n/);
  const sections = [];
  let currentSection = null;
  let requiresResultLine = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }

    if (/^Result:\s*/.test(line)) {
      requiresResultLine = true;
      continue;
    }

    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      currentSection = {
        name: headingMatch[1].trim(),
        bulletRules: [],
        tableHeader: null,
      };
      sections.push(currentSection);
      continue;
    }

    if (!currentSection) {
      continue;
    }

    if (line.startsWith("|") && currentSection.tableHeader === null) {
      const headerCells = parseTableCells(line);
      const separatorLine = lines[index + 1]?.trim() ?? "";
      if (separatorLine.startsWith("|")) {
        const separatorCells = parseTableCells(separatorLine);
        if (isTableSeparatorRow(separatorCells)) {
          currentSection.tableHeader = headerCells;
          continue;
        }
      }
    }

    if (line.startsWith("- ")) {
      currentSection.bulletRules.push(parseBulletRule(line.slice(2).trim()));
    }
  }

  return {
    requiresResultLine,
    sections,
    errors: [],
  };
}

function findFirstMarkdownTable(markdownText) {
  const lines = markdownText.split(/\r?\n/);
  for (let index = 0; index < lines.length - 1; index += 1) {
    const headerLine = lines[index].trim();
    const separatorLine = lines[index + 1].trim();
    if (!headerLine.startsWith("|") || !separatorLine.startsWith("|")) {
      continue;
    }
    const headerCells = parseTableCells(headerLine);
    const separatorCells = parseTableCells(separatorLine);
    if (!isTableSeparatorRow(separatorCells)) {
      continue;
    }
    const rows = [];
    for (let rowIndex = index + 2; rowIndex < lines.length; rowIndex += 1) {
      const rowLine = lines[rowIndex].trim();
      if (!rowLine.startsWith("|")) {
        break;
      }
      rows.push(parseTableCells(rowLine));
    }
    return { header: headerCells, rows };
  }
  return null;
}

function parseGradingRubric(rubricText) {
  const table = findFirstMarkdownTable(rubricText);
  if (!table) {
    return {
      dimensions: [],
      errors: ["Bundled grading rubric is missing its primary scoring table."],
    };
  }

  if (table.header.length < 2) {
    return {
      dimensions: [],
      errors: ["Bundled grading rubric table must expose dimension and threshold data in its first two columns."],
    };
  }
  const dimensionIndex = 0;
  const thresholdIndex = 1;

  const errors = [];
  const dimensions = table.rows.map((row) => {
    const name = row[dimensionIndex];
    const threshold = parseNumber(row[thresholdIndex]);
    if (!name) {
      errors.push("Bundled grading rubric contains a dimension row with no name.");
    }
    if (threshold === null) {
      errors.push(`Bundled grading rubric threshold for ${name || "unknown"} is not numeric.`);
    }
    return { name, threshold };
  }).filter((entry) => entry.name);

  if (dimensions.length === 0) {
    errors.push("Bundled grading rubric does not define any dimensions.");
  }

  return { dimensions, errors };
}

function parseDimensionRubricReferences(rubricText) {
  const references = new Map();
  for (const rawLine of rubricText.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^-\s*`([^`]+)`\s+for\s+(.+?)\s*$/);
    if (match) {
      references.set(match[2].trim(), match[1]);
    }
  }
  return references;
}

function tryParseSeverityRubric(severityText) {
  const lines = severityText.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => /^\s*severity_levels:\s*$/.test(line));
  if (startIndex === -1) {
    return null;
  }

  const levels = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      continue;
    }
    if (/^[A-Za-z0-9_-]+:\s*$/.test(line) && !line.startsWith("-")) {
      break;
    }
    const match = line.match(/^-\s*([A-Za-z0-9_-]+)\s*:/);
    if (match) {
      levels.push(match[1]);
    }
  }

  if (levels.length === 0) {
    return {
      severityLevels: [],
      errors: ["Severity rubric does not define any severity levels."],
    };
  }

  return {
    severityLevels: levels,
    errors: [],
  };
}

function resolveSeverityRubric(referencesRoot, selectedRubricDoc) {
  const referenceFiles = [...new Set(parseDimensionRubricReferences(selectedRubricDoc.body).values())];
  const errors = [];

  for (const referenceFile of referenceFiles) {
    const referencePath = path.join(referencesRoot, "rubrics", referenceFile);
    if (!fs.existsSync(referencePath)) {
      errors.push(`Missing dimension rubric reference: ${referencePath}`);
      continue;
    }

    const rubricDoc = readMarkdownDocument(referencePath);
    const parsedSeverityRubric = tryParseSeverityRubric(rubricDoc.body);
    if (parsedSeverityRubric) {
      return {
        severityRubric: parsedSeverityRubric,
        errors,
      };
    }
  }

  return {
    severityRubric: {
      severityLevels: [],
      errors: ["No dimension rubric referenced by the bundled grading rubric exposes a severity_levels block."],
    },
    errors,
  };
}

function buildTableHeaderPattern(headerCells) {
  return new RegExp(
    `^\\|\\s*${headerCells.map(escapeRegex).join("\\s*\\|\\s*")}\\s*\\|\\s*$`,
    "m",
  );
}

function buildTemplateStructureErrors(text, templateSpec) {
  const errors = [];
  const sectionTexts = new Map();

  if (templateSpec.requiresResultLine && !/^Result:\s*(PASS|FAIL)\s*$/m.test(text)) {
    errors.push("Missing or malformed Result line.");
  }

  for (const section of templateSpec.sections) {
    const sectionText = extractSection(text, section.name);
    if (!sectionText) {
      errors.push(`Missing or malformed ${section.name} section.`);
      continue;
    }
    sectionTexts.set(section.name, sectionText);

    if (section.tableHeader) {
      const tableHeaderPattern = buildTableHeaderPattern(section.tableHeader);
      if (!tableHeaderPattern.test(sectionText)) {
        errors.push(`Missing or malformed ${section.name} table.`);
      }
    }

    const bulletRules = section.bulletRules;
    if (bulletRules.length === 0) {
      continue;
    }

    const bulletLines = sectionText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.startsWith("- "));

    const labeledRules = bulletRules.filter((rule) => rule.type === "label");
    if (labeledRules.length > 0) {
      for (const rule of labeledRules) {
        const pattern = new RegExp(
          `^-\\s*${escapeInlineCodeRegex(rule.label)}:\\s*.+$`,
          "m",
        );
        if (!pattern.test(sectionText)) {
          errors.push(`Missing or malformed ${section.name} bullet for ${rule.label}.`);
        }
      }
      continue;
    }

    if (bulletLines.length === 0) {
      errors.push(`Missing bullet content in ${section.name}.`);
    }
  }

  return { errors, sectionTexts };
}

function getSectionByIndex(templateSpec, index) {
  return templateSpec.sections[index] ?? null;
}

function loadReportReferenceContext(reportType) {
  const reportConfig = REPORT_REFERENCE_CONFIG[reportType];
  const referencesRoot = path.resolve(
    import.meta.dirname,
    "..",
    "skills",
    reportConfig.skillName,
    "references",
  );
  const templatePath = path.join(
    referencesRoot,
    reportConfig.templateRelativePath,
  );
  const gradingRubricPath = path.join(
    referencesRoot,
    reportConfig.gradingRubricRelativePath,
  );
  const errors = [];

  const templateDoc = fs.existsSync(templatePath) ? readMarkdownDocument(templatePath) : null;
  if (!templateDoc) {
    errors.push(`Missing template reference: ${templatePath}`);
  }

  const gradingRubricDoc = fs.existsSync(gradingRubricPath)
    ? readMarkdownDocument(gradingRubricPath)
    : null;
  if (!gradingRubricDoc) {
    errors.push(`Missing grading rubric reference: ${gradingRubricPath}`);
  }

  const templateSpec = templateDoc
    ? parseTemplateSchema(templateDoc.body)
    : { requiresResultLine: false, sections: [], errors: [] };
  const gradingRubric = gradingRubricDoc
    ? parseGradingRubric(gradingRubricDoc.body)
    : { dimensions: [], errors: [] };
  const severityResolution = gradingRubricDoc
    ? resolveSeverityRubric(referencesRoot, gradingRubricDoc)
    : {
        severityRubric: { severityLevels: [], errors: [] },
        errors: [],
      };
  const severityRubric = severityResolution.severityRubric;

  return {
    templateSpec,
    gradingRubric,
    severityRubric,
    errors: [
      ...errors,
      ...templateSpec.errors,
      ...gradingRubric.errors,
      ...severityResolution.errors,
      ...severityRubric.errors,
    ],
  };
}

function addQaLogicErrors(text, referenceContext, sectionTexts, errors) {
  const bugsSection = getSectionByIndex(referenceContext.templateSpec, 2);
  const hardFailSection = getSectionByIndex(referenceContext.templateSpec, 3);
  const scorecardSection = getSectionByIndex(referenceContext.templateSpec, 4);

  const allowedSeverities = new Set(referenceContext.severityRubric.severityLevels);
  const bugsRows = parseMarkdownTable(sectionTexts.get(bugsSection?.name ?? "") ?? "");
  const bugsSeverityIndex = 1;
  for (const row of bugsRows) {
    const severity = row[bugsSeverityIndex];
    if (severity && !allowedSeverities.has(severity)) {
      errors.push(
        `Invalid bug severity ${severity}. Allowed severities: ${referenceContext.severityRubric.severityLevels.join(", ")}.`,
      );
    }
  }

  const hardFailRows = parseMarkdownTable(sectionTexts.get(hardFailSection?.name ?? "") ?? "");
  const hardFailStatusIndex = 1;
  const hardFailStates = hardFailRows
    .map((row) => row[hardFailStatusIndex])
    .filter(Boolean);
  if (hardFailSection && hardFailStates.length === 0) {
    errors.push(`${hardFailSection.name} table has no PASS/FAIL rows.`);
  }
  if (hardFailStates.some((state) => !["PASS", "FAIL"].includes(state))) {
    errors.push(`${hardFailSection?.name ?? "Hard-fail"} table may only use PASS or FAIL states.`);
  }

  const scorecardRows = parseMarkdownTable(sectionTexts.get(scorecardSection?.name ?? "") ?? "");
  const scorecardDimensionIndex = 0;
  const scorecardScoreIndex = 1;
  const scorecardThresholdIndex = 2;
  const scorecardPassIndex = 3;
  const scorecardRowMap = new Map(
    scorecardRows
      .map((row) => [row[scorecardDimensionIndex], row])
      .filter(([dimension]) => Boolean(dimension)),
  );
  const rubricDimensions = referenceContext.gradingRubric.dimensions;
  const expectedDimensionNames = new Set(rubricDimensions.map((entry) => entry.name));

  for (const dimension of rubricDimensions) {
    const row = scorecardRowMap.get(dimension.name);
    if (!row) {
      errors.push(`Missing Scorecard row for ${dimension.name}.`);
      continue;
    }

    const score = parseNumber(row[scorecardScoreIndex]);
    const threshold = parseNumber(row[scorecardThresholdIndex]);
    const passValue = row[scorecardPassIndex];

    if (score === null) {
      errors.push(`Scorecard row for ${dimension.name} must use a numeric score.`);
    }
    if (threshold === null) {
      errors.push(`Scorecard row for ${dimension.name} must use a numeric threshold.`);
    } else if (dimension.threshold !== null && threshold !== dimension.threshold) {
      errors.push(
        `Scorecard row for ${dimension.name} must use threshold ${dimension.threshold} from the bundled grading rubric.`,
      );
    }
    if (!["PASS", "FAIL"].includes(passValue)) {
      errors.push(`Scorecard row for ${dimension.name} must use PASS or FAIL in Pass?.`);
    }
    if (score !== null && threshold !== null && ["PASS", "FAIL"].includes(passValue)) {
      const shouldPass = score >= threshold;
      if (shouldPass && passValue !== "PASS") {
        errors.push(`Scorecard row for ${dimension.name} must mark PASS when score meets threshold.`);
      }
      if (!shouldPass && passValue !== "FAIL") {
        errors.push(`Scorecard row for ${dimension.name} must mark FAIL when score is below threshold.`);
      }
    }
  }

  for (const row of scorecardRows) {
    const dimensionName = row[scorecardDimensionIndex];
    if (dimensionName && !expectedDimensionNames.has(dimensionName)) {
      errors.push(`Unexpected Scorecard row for ${dimensionName}; use only dimensions from the bundled grading rubric.`);
    }
  }

  const resultMatch = text.match(/^Result:\s*(PASS|FAIL)\s*$/m);
  const result = resultMatch?.[1] ?? null;
  if (result === "PASS") {
    if (hardFailStates.includes("FAIL")) {
      errors.push("Overall Result cannot be PASS when a Hard-Fail Gate is FAIL.");
    }
    const failingRows = rubricDimensions.filter((dimension) => {
      const row = scorecardRowMap.get(dimension.name);
      return row?.[scorecardPassIndex] === "FAIL";
    });
    if (failingRows.length > 0) {
      errors.push("Overall Result cannot be PASS when any Scorecard row is FAIL.");
    }
  }
}

function addRetestLogicErrors(text, referenceContext, sectionTexts, errors) {
  const retestedSection = getSectionByIndex(referenceContext.templateSpec, 0);
  const remainingSection = getSectionByIndex(referenceContext.templateSpec, 1);
  const hardFailSection = getSectionByIndex(referenceContext.templateSpec, 2);

  const retestedRows = parseMarkdownTable(sectionTexts.get(retestedSection?.name ?? "") ?? "");
  if (retestedRows.length === 0) {
    errors.push(`${retestedSection?.name ?? "Retested Items"} table must contain at least one retested row.`);
  }
  const retestResultIndex = 2;
  for (const row of retestedRows) {
    const value = row[retestResultIndex];
    if (value && !["PASS", "FAIL"].includes(value)) {
      errors.push(`${retestedSection?.name ?? "Retested Items"} rows must use PASS or FAIL in Retest Result.`);
      break;
    }
  }

  const allowedSeverities = new Set(referenceContext.severityRubric.severityLevels);
  const remainingRows = parseMarkdownTable(sectionTexts.get(remainingSection?.name ?? "") ?? "");
  const remainingSeverityIndex = 1;
  for (const row of remainingRows) {
    const severity = row[remainingSeverityIndex];
    if (severity && !allowedSeverities.has(severity)) {
      errors.push(
        `Invalid remaining bug severity ${severity}. Allowed severities: ${referenceContext.severityRubric.severityLevels.join(", ")}.`,
      );
    }
  }

  const hardFailRows = parseMarkdownTable(sectionTexts.get(hardFailSection?.name ?? "") ?? "");
  const hardFailStatusIndex = 1;
  const hardFailStates = hardFailRows
    .map((row) => row[hardFailStatusIndex])
    .filter(Boolean);
  if (hardFailStates.some((state) => !["PASS", "FAIL"].includes(state))) {
    errors.push(`${hardFailSection?.name ?? "Hard-fail"} table may only use PASS or FAIL states.`);
  }

  const resultMatch = text.match(/^Result:\s*(PASS|FAIL)\s*$/m);
  if (resultMatch?.[1] === "PASS" && hardFailStates.includes("FAIL")) {
    errors.push("Overall Result cannot be PASS when a Hard-Fail Gate is FAIL.");
  }
}

function addFinalLogicErrors(referenceContext, sectionTexts, errors) {
  const remainingSection = getSectionByIndex(referenceContext.templateSpec, 2);
  const scoreSummarySection = getSectionByIndex(referenceContext.templateSpec, 3);
  const sprintOutcomesSection = getSectionByIndex(referenceContext.templateSpec, 1);

  const allowedSeverities = new Set(referenceContext.severityRubric.severityLevels);
  const remainingRows = parseMarkdownTable(sectionTexts.get(remainingSection?.name ?? "") ?? "");
  const remainingSeverityIndex = 1;
  for (const row of remainingRows) {
    const severity = row[remainingSeverityIndex];
    if (severity && !allowedSeverities.has(severity)) {
      errors.push(
        `Invalid remaining issue severity ${severity}. Allowed severities: ${referenceContext.severityRubric.severityLevels.join(", ")}.`,
      );
    }
  }

  const scoreSummaryRows = parseMarkdownTable(sectionTexts.get(scoreSummarySection?.name ?? "") ?? "");
  const scoreSummaryDimensionIndex = 0;
  const scoreSummaryRowMap = new Map(
    scoreSummaryRows
      .map((row) => [row[scoreSummaryDimensionIndex], row])
      .filter(([dimension]) => Boolean(dimension)),
  );
  const rubricDimensions = referenceContext.gradingRubric.dimensions;
  const expectedDimensionNames = new Set(rubricDimensions.map((entry) => entry.name));
  for (const dimension of rubricDimensions) {
    if (!scoreSummaryRowMap.has(dimension.name)) {
      errors.push(`Missing Score Summary row for ${dimension.name}.`);
    }
  }
  for (const row of scoreSummaryRows) {
    const dimensionName = row[scoreSummaryDimensionIndex];
    if (dimensionName && !expectedDimensionNames.has(dimensionName)) {
      errors.push(`Unexpected Score Summary row for ${dimensionName}; use only dimensions from the bundled grading rubric.`);
    }
  }

  const sprintRows = parseMarkdownTable(sectionTexts.get(sprintOutcomesSection?.name ?? "") ?? "");
  if (sprintRows.length === 0) {
    errors.push(`${sprintOutcomesSection?.name ?? "Sprint Outcomes"} table must contain at least one sprint row.`);
  }
}

function validateQaReport(filePath, projectRoot) {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      valid: false,
      errors: [`QA report not found: ${filePath}`],
      result: null,
    };
  }

  const referenceContext = loadReportReferenceContext("qa");
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const { errors, sectionTexts } = buildTemplateStructureErrors(
    text,
    referenceContext.templateSpec,
  );
  errors.unshift(...referenceContext.errors);
  addQaLogicErrors(text, referenceContext, sectionTexts, errors);

  const resultMatch = text.match(/^Result:\s*(PASS|FAIL)\s*$/m);
  return {
    exists: true,
    valid: errors.length === 0,
    errors,
    result: resultMatch?.[1] ?? null,
  };
}

function validateRetestReport(filePath, projectRoot) {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      valid: false,
      errors: [`Retest report not found: ${filePath}`],
      result: null,
    };
  }

  const referenceContext = loadReportReferenceContext("retest");
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const { errors, sectionTexts } = buildTemplateStructureErrors(
    text,
    referenceContext.templateSpec,
  );
  errors.unshift(...referenceContext.errors);
  addRetestLogicErrors(text, referenceContext, sectionTexts, errors);

  const resultMatch = text.match(/^Result:\s*(PASS|FAIL)\s*$/m);
  return {
    exists: true,
    valid: errors.length === 0,
    errors,
    result: resultMatch?.[1] ?? null,
  };
}

function validateFinalReport(filePath, projectRoot) {
  if (!fs.existsSync(filePath)) {
    return {
      exists: false,
      valid: false,
      errors: [`Final report not found: ${filePath}`],
      result: null,
    };
  }

  const referenceContext = loadReportReferenceContext("final");
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const { errors, sectionTexts } = buildTemplateStructureErrors(
    text,
    referenceContext.templateSpec,
  );
  errors.unshift(...referenceContext.errors);
  addFinalLogicErrors(referenceContext, sectionTexts, errors);

  const resultMatch = text.match(/^Result:\s*(PASS|FAIL)\s*$/m);
  return {
    exists: true,
    valid: errors.length === 0,
    errors,
    result: resultMatch?.[1] ?? null,
  };
}

export function getReportValidation(reportType, projectRoot, rawSprint) {
  const sprint = reportType === "final" ? null : resolveSprint(projectRoot, rawSprint);
  const filePath = reportPath(reportType, projectRoot, sprint);
  if (reportType === "qa") {
    return { projectRoot, sprint, filePath, ...validateQaReport(filePath, projectRoot) };
  }
  if (reportType === "retest") {
    return {
      projectRoot,
      sprint,
      filePath,
      ...validateRetestReport(filePath, projectRoot),
    };
  }
  if (reportType === "final") {
    return {
      projectRoot,
      sprint,
      filePath,
      ...validateFinalReport(filePath, projectRoot),
    };
  }
  throw new Error(`Unsupported report type: ${reportType}`);
}

export function buildReportAdditionalContext(reportType) {
  if (reportType === "qa") {
    return [
      "QA write contract:",
      "- Read the rubric files bundled with this skill and obey them exactly.",
      "- Read the QA report template/schema bundled with this skill and obey it exactly.",
      "- When rewriting, recompute the report from evidence instead of patching structure only.",
    ].join("\n");
  }
  if (reportType === "retest") {
    return [
      "Retest write contract:",
      "- Read the rubric files bundled with this skill and obey them exactly.",
      "- Read the retest report template/schema bundled with this skill and obey it exactly.",
      "- When rewriting, recompute conclusions from evidence instead of patching structure only.",
    ].join("\n");
  }
  return [
    "Final report contract:",
    "- Read the rubric files bundled with this skill and obey them exactly.",
    "- Read the final report template/schema bundled with this skill and obey it exactly.",
    "- When rewriting, recompute the final assessment from evidence instead of patching structure only.",
  ].join("\n");
}

const isEntrypoint =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const reportType = process.argv[2];
  const command = process.argv[3];

  if (!reportType || !command) {
    usage();
  }

  if (!["qa", "retest", "final"].includes(reportType)) {
    console.error(`Unsupported report type: ${reportType}`);
    process.exit(1);
  }

  const projectRoot = resolveProjectRoot(process.argv[4]);
  const validation = getReportValidation(reportType, projectRoot, process.argv[5]);

  if (command === "path") {
    printJson({
      reportType,
      projectRoot,
      sprint: validation.sprint,
      filePath: validation.filePath,
    });
    process.exit(0);
  }

  if (command === "validate") {
    printJson({ reportType, ...validation });
    process.exit(validation.valid ? 0 : 1);
  }

  if (command === "result") {
    if (!validation.valid || !validation.result) {
      printJson({ reportType, ...validation });
      process.exit(1);
    }
    printJson({
      reportType,
      projectRoot,
      sprint: validation.sprint,
      filePath: validation.filePath,
      result: validation.result,
    });
    process.exit(0);
  }

  usage();
}
