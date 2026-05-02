import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";

export const SERIAL_HARNESS_DIR = ".harness";
export const PARALLEL_HARNESS_DIR = ".harness-parallel";
export const STATUS_FILE = path.join(SERIAL_HARNESS_DIR, "status.md");
export const RUNTIME_FILE = path.join(SERIAL_HARNESS_DIR, "runtime.md");
export const CHECKPOINT_FILE = path.join(SERIAL_HARNESS_DIR, "checkpoints", "latest.md");
export const PARALLEL_STATE_HEADING = "## Parallel Execution State";
export const CONTRACT_GRAPH_HEADING = "## Dependency Graph JSON";

export function harnessDirForAction(actionName) {
  return String(actionName ?? "").endsWith("_parallel")
    ? PARALLEL_HARNESS_DIR
    : SERIAL_HARNESS_DIR;
}

export function harnessPath(harnessDir, ...segments) {
  return path.join(harnessDir || SERIAL_HARNESS_DIR, ...segments);
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseScalar(rawValue) {
  const value = stripQuotes(String(rawValue).trim());
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (/^-?\d+$/.test(value)) {
    return Number.parseInt(value, 10);
  }
  return value;
}

export function serializeScalar(value) {
  if (typeof value === "boolean" || typeof value === "number") {
    return String(value);
  }
  const stringValue = String(value ?? "");
  if (/^[A-Za-z0-9._/-]+$/.test(stringValue)) {
    return stringValue;
  }
  return JSON.stringify(stringValue);
}

export function parseFrontmatterBlock(block) {
  const data = {};
  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }
    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    data[key] = parseScalar(rawValue);
  }
  return data;
}

export function serializeFrontmatter(data) {
  const lines = Object.entries(data).map(
    ([key, value]) => `${key}: ${serializeScalar(value)}`,
  );
  return `---\n${lines.join("\n")}\n---\n`;
}

export function readMarkdownDocument(filePath) {
  const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: text, hasFrontmatter: false };
  }
  return {
    frontmatter: parseFrontmatterBlock(match[1]),
    body: match[2],
    hasFrontmatter: true,
  };
}

export function readOptionalMarkdownDocument(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return readMarkdownDocument(filePath);
}

export function writeMarkdownDocument(filePath, frontmatter, body) {
  const normalizedBody = body.startsWith("\n") ? body.slice(1) : body;
  const output = `${serializeFrontmatter(frontmatter)}${normalizedBody}`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, output, "utf8");
}

export function ensureHarnessDirs(projectRoot, harnessDir = SERIAL_HARNESS_DIR) {
  const dirs = [
    path.join(projectRoot, harnessDir),
    path.join(projectRoot, harnessDir, "contracts"),
    path.join(projectRoot, harnessDir, "qa"),
    path.join(projectRoot, harnessDir, "final"),
    path.join(projectRoot, harnessDir, "checkpoints"),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readStatusDocument(projectRoot, harnessDir = SERIAL_HARNESS_DIR) {
  const filePath = path.join(projectRoot, harnessPath(harnessDir, "status.md"));
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return { path: filePath, ...readMarkdownDocument(filePath) };
}

export function readRuntimeDocument(projectRoot, harnessDir = SERIAL_HARNESS_DIR) {
  const filePath = path.join(projectRoot, harnessPath(harnessDir, "runtime.md"));
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return { path: filePath, ...readMarkdownDocument(filePath) };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeSectionHeading(heading) {
  const trimmed = String(heading ?? "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.startsWith("## ") ? trimmed : `## ${trimmed}`;
}

export function extractMarkdownSection(body, heading) {
  const normalizedHeading = normalizeSectionHeading(heading);
  if (!normalizedHeading) {
    return null;
  }
  const source = String(body ?? "");
  const headingPattern = new RegExp(`^${escapeRegExp(normalizedHeading)}\\s*$`, "m");
  const headingMatch = source.match(headingPattern);
  if (!headingMatch || headingMatch.index == null) {
    return null;
  }
  const sectionStart = headingMatch.index + headingMatch[0].length;
  const rest = source.slice(sectionStart).replace(/^\r?\n/, "");
  const nextHeadingMatch = rest.match(/^##\s+/m);
  const section = nextHeadingMatch?.index == null ? rest : rest.slice(0, nextHeadingMatch.index);
  return section.trim();
}

export function extractJsonCodeBlock(sectionText) {
  const match = String(sectionText ?? "").match(/```(?:json)?\r?\n([\s\S]*?)\r?\n```/i);
  if (!match) {
    return null;
  }
  return match[1].trim();
}

export function readJsonSectionFromBody(body, heading) {
  const result = readJsonSectionFromBodyResult(body, heading);
  return result.ok ? result.data : null;
}

export function readJsonSectionFromBodyResult(body, heading) {
  const sectionText = extractMarkdownSection(body, heading);
  if (!sectionText) {
    return {
      ok: false,
      data: null,
      error: `${normalizeSectionHeading(heading)} section is missing.`,
    };
  }
  const jsonText = extractJsonCodeBlock(sectionText);
  if (!jsonText) {
    return {
      ok: false,
      data: null,
      error: `${normalizeSectionHeading(heading)} section must contain a JSON code block.`,
    };
  }
  try {
    return { ok: true, data: JSON.parse(jsonText), error: null };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: `${normalizeSectionHeading(heading)} contains invalid JSON: ${error.message}`,
    };
  }
}

export function upsertJsonSection(body, heading, data) {
  const normalizedHeading = normalizeSectionHeading(heading);
  const renderedSection = [
    normalizedHeading,
    "```json",
    JSON.stringify(data, null, 2),
    "```",
  ].join("\n");
  const source = String(body ?? "");
  const headingPattern = new RegExp(`^${escapeRegExp(normalizedHeading)}\\s*$`, "m");
  const headingMatch = source.match(headingPattern);
  if (headingMatch?.index != null) {
    const sectionStart = headingMatch.index;
    const contentStart = sectionStart + headingMatch[0].length;
    const restStart = contentStart + (source.slice(contentStart).match(/^\r?\n/)?.[0].length ?? 0);
    const rest = source.slice(restStart);
    const nextHeadingMatch = rest.match(/^##\s+/m);
    const sectionEnd = nextHeadingMatch?.index == null ? source.length : restStart + nextHeadingMatch.index;
    const after = source.slice(sectionEnd).replace(/^\r?\n+/, "");
    const trailing = after ? `\n\n${after}` : "\n";
    return `${source.slice(0, sectionStart)}${renderedSection}${trailing}`;
  }
  const trimmed = source.trimEnd();
  if (!trimmed) {
    return `${renderedSection}\n`;
  }
  return `${trimmed}\n\n${renderedSection}\n`;
}

export function readStatusParallelState(projectRoot, harnessDir = PARALLEL_HARNESS_DIR) {
  const status = readStatusDocument(projectRoot, harnessDir);
  if (!status) {
    return null;
  }
  const data = readJsonSectionFromBody(status.body, PARALLEL_STATE_HEADING);
  return data ?? null;
}

export function readJsonSectionFromMarkdownFile(filePath, heading) {
  const result = readJsonSectionFromMarkdownFileResult(filePath, heading);
  return result.ok ? result.data : null;
}

export function readJsonSectionFromMarkdownFileResult(filePath, heading) {
  const document = readMarkdownDocument(filePath);
  return readJsonSectionFromBodyResult(document.body, heading);
}

function normalizeOwnedPath(rawPath) {
  return String(rawPath ?? "").replace(/\\/g, "/").replace(/^\.\/+/, "").replace(/\/+/g, "/").trim();
}

function staticPathPrefix(pattern) {
  const normalized = normalizeOwnedPath(pattern);
  const wildcardIndex = normalized.search(/[*?[{]/);
  if (wildcardIndex === -1) {
    return normalized.replace(/\/\*\*$/, "").replace(/\/\*$/, "");
  }
  return normalized.slice(0, wildcardIndex).replace(/\/+$/, "");
}

function pathsMayOverlap(left, right) {
  const a = normalizeOwnedPath(left);
  const b = normalizeOwnedPath(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const prefixA = staticPathPrefix(a);
  const prefixB = staticPathPrefix(b);
  if (!prefixA || !prefixB) {
    return false;
  }
  return (
    prefixA === prefixB ||
    prefixA.startsWith(`${prefixB}/`) ||
    prefixB.startsWith(`${prefixA}/`)
  );
}

export function findOwnedPathOverlaps(nodes) {
  const overlaps = [];
  const list = Array.isArray(nodes) ? nodes : [];
  for (let index = 0; index < list.length; index += 1) {
    const left = list[index];
    for (let inner = index + 1; inner < list.length; inner += 1) {
      const right = list[inner];
      for (const leftPath of left.owned_paths ?? []) {
        for (const rightPath of right.owned_paths ?? []) {
          if (pathsMayOverlap(leftPath, rightPath)) {
            overlaps.push({
              leftNode: left.id,
              rightNode: right.id,
              leftPath: normalizeOwnedPath(leftPath),
              rightPath: normalizeOwnedPath(rightPath),
            });
          }
        }
      }
    }
  }
  return overlaps;
}

function validateGraphNodes(nodes, { requireBehaviorIds = false, requireBugIds = false } = {}) {
  const errors = [];
  const idSet = new Set();
  const normalizedNodes = [];

  for (const rawNode of Array.isArray(nodes) ? nodes : []) {
    const node = {
      id: String(rawNode?.id ?? "").trim(),
      title: String(rawNode?.title ?? "").trim(),
      goal: String(rawNode?.goal ?? "").trim(),
      owned_paths: Array.isArray(rawNode?.owned_paths)
        ? rawNode.owned_paths.map(normalizeOwnedPath).filter(Boolean)
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

    if (!node.id) {
      errors.push("Every graph node must have a non-empty id.");
      continue;
    }
    if (idSet.has(node.id)) {
      errors.push(`Duplicate graph node id: ${node.id}.`);
      continue;
    }
    idSet.add(node.id);
    if (!node.owned_paths.length) {
      errors.push(`Graph node ${node.id} must declare at least one owned_paths entry.`);
    }
    if (requireBehaviorIds && !node.behavior_ids.length) {
      errors.push(`Build graph node ${node.id} must declare behavior_ids.`);
    }
    if (requireBugIds && !node.bug_ids.length) {
      errors.push(`Fix graph node ${node.id} must declare bug_ids.`);
    }
    normalizedNodes.push(node);
  }

  for (const node of normalizedNodes) {
    if (node.depends_on.includes(node.id)) {
      errors.push(`Graph node ${node.id} cannot depend on itself.`);
    }
    for (const dependency of node.depends_on) {
      if (!idSet.has(dependency)) {
        errors.push(`Graph node ${node.id} depends on unknown node ${dependency}.`);
      }
    }
  }

  const overlaps = findOwnedPathOverlaps(normalizedNodes);
  for (const overlap of overlaps) {
    errors.push(
      `Owned path overlap between ${overlap.leftNode} (${overlap.leftPath}) and ${overlap.rightNode} (${overlap.rightPath}).`,
    );
  }

  const state = new Map();
  function visit(nodeId, stack = []) {
    const current = state.get(nodeId);
    if (current === "visiting") {
      errors.push(`Dependency cycle detected: ${[...stack, nodeId].join(" -> ")}.`);
      return;
    }
    if (current === "visited") {
      return;
    }
    state.set(nodeId, "visiting");
    const node = normalizedNodes.find((item) => item.id === nodeId);
    for (const dependency of node?.depends_on ?? []) {
      visit(dependency, [...stack, nodeId]);
    }
    state.set(nodeId, "visited");
  }
  for (const node of normalizedNodes) {
    visit(node.id);
  }

  return { errors, nodes: normalizedNodes };
}

export function validateBuildGraph(data) {
  if (!data || typeof data !== "object") {
    return { errors: ["Dependency graph JSON must be an object."], nodes: [] };
  }
  if (!Array.isArray(data.nodes) || !data.nodes.length) {
    return { errors: ["Dependency graph JSON must include a non-empty nodes array."], nodes: [] };
  }
  return validateGraphNodes(data.nodes, { requireBehaviorIds: true });
}

export function statusSummary(frontmatter) {
  const lines = [
    `Phase: ${frontmatter.phase ?? "UNKNOWN"}`,
    `Current sprint: ${frontmatter.current_sprint ?? "?"}/${frontmatter.total_sprints ?? "?"}`,
    `Pending action: ${frontmatter.pending_action ?? "unknown"}`,
    `Last agent: ${frontmatter.last_agent ?? "unknown"}`,
    `Approval required: ${frontmatter.approval_required ?? false}`,
  ];
  return lines.join("\n");
}

export function formatSprintNumber(value) {
  const number = Number.parseInt(String(value ?? 0), 10);
  if (Number.isNaN(number) || number < 0) {
    return "00";
  }
  return String(number).padStart(2, "0");
}

function excerptFile(filePath, maxLines = 20) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).slice(0, maxLines);
  return lines.join("\n").trim();
}

export function writeCheckpoint(projectRoot, source = "auto", harnessDir = SERIAL_HARNESS_DIR) {
  ensureHarnessDirs(projectRoot, harnessDir);
  const status = readStatusDocument(projectRoot, harnessDir);
  if (!status) {
    return null;
  }

  const sprint = formatSprintNumber(status.frontmatter.current_sprint);
  const relatedFiles = [
    path.join(projectRoot, harnessDir, "intake.md"),
    path.join(projectRoot, harnessDir, "spec.md"),
    path.join(projectRoot, harnessDir, "design-direction.md"),
    path.join(projectRoot, harnessDir, "runtime.md"),
    path.join(projectRoot, harnessDir, "contracts", `sprint-${sprint}-contract.md`),
    path.join(projectRoot, harnessDir, "contracts", `sprint-${sprint}-review.md`),
    path.join(projectRoot, harnessDir, "qa", `sprint-${sprint}-self-check.md`),
    path.join(projectRoot, harnessDir, "qa", `sprint-${sprint}-qa-report.md`),
    path.join(projectRoot, harnessDir, "qa", `sprint-${sprint}-fix-log.md`),
    path.join(projectRoot, harnessDir, "qa", `sprint-${sprint}-retest.md`),
    path.join(projectRoot, harnessDir, "final", "qa-final-report.md"),
  ];

  const sections = [
    "# Auto-Harness Checkpoint",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Source: ${source}`,
    `- Project root: ${projectRoot}`,
    "",
    "## Status Summary",
    statusSummary(status.frontmatter),
  ];

  for (const filePath of relatedFiles) {
    const excerpt = excerptFile(filePath);
    if (!excerpt) {
      continue;
    }
    sections.push("");
    sections.push(`## ${path.relative(projectRoot, filePath).replace(/\\/g, "/")}`);
    sections.push("```md");
    sections.push(excerpt);
    sections.push("```");
  }

  const checkpointPath = path.join(projectRoot, harnessPath(harnessDir, "checkpoints", "latest.md"));
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
  fs.writeFileSync(checkpointPath, `${sections.join("\n")}\n`, "utf8");
  return checkpointPath;
}

export function readCheckpoint(projectRoot, harnessDir = SERIAL_HARNESS_DIR) {
  const filePath = path.join(projectRoot, harnessPath(harnessDir, "checkpoints", "latest.md"));
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return fs.readFileSync(filePath, "utf8");
}

export function resolvePluginRoot(explicitRoot) {
  if (explicitRoot) {
    return path.resolve(explicitRoot);
  }
  return path.resolve(import.meta.dirname, "..");
}

export function httpGet(url, timeoutMs = 5000) {
  const client = url.startsWith("https:") ? https : http;
  return new Promise((resolve, reject) => {
    const request = client.get(
      url,
      {
        timeout: timeoutMs,
        headers: {
          "user-agent": "auto-harness-runtime-check/1.0",
        },
      },
      (response) => {
        response.resume();
        resolve({
          ok: response.statusCode >= 200 && response.statusCode < 400,
          statusCode: response.statusCode,
          url,
        });
      },
    );

    request.on("timeout", () => {
      request.destroy(new Error(`Timed out after ${timeoutMs}ms`));
    });
    request.on("error", reject);
  });
}
