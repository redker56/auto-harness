import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import https from "node:https";

export const STATUS_FILE = path.join(".harness", "status.md");
export const RUNTIME_FILE = path.join(".harness", "runtime.md");
export const CHECKPOINT_FILE = path.join(".harness", "checkpoints", "latest.md");
export const MODULES_DIR = "modules";

function stripQuotes(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
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

export function ensureHarnessDirs(projectRoot) {
  const dirs = [
    path.join(projectRoot, ".harness"),
    path.join(projectRoot, ".harness", "contracts"),
    path.join(projectRoot, ".harness", "qa"),
    path.join(projectRoot, ".harness", "final"),
    path.join(projectRoot, ".harness", "checkpoints"),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readStatusDocument(projectRoot) {
  const filePath = path.join(projectRoot, STATUS_FILE);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const document = readMarkdownDocument(filePath);
  return { path: filePath, ...document };
}

export function readRuntimeDocument(projectRoot) {
  const filePath = path.join(projectRoot, RUNTIME_FILE);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const document = readMarkdownDocument(filePath);
  return { path: filePath, ...document };
}

export function statusSummary(frontmatter) {
  const lines = [
    `Phase: ${frontmatter.phase ?? "UNKNOWN"}`,
    `Current sprint: ${frontmatter.current_sprint ?? "?"}/${frontmatter.total_sprints ?? "?"}`,
    `Pending action: ${frontmatter.pending_action ?? "unknown"}`,
    `Last agent: ${frontmatter.last_agent ?? "unknown"}`,
    `Approval required: ${frontmatter.approval_required ?? false}`,
    `Updated at: ${frontmatter.updated_at ?? "unknown"}`,
  ];
  if (frontmatter.selected_pack) {
    lines.splice(4, 0, `Selected pack: ${frontmatter.selected_pack}`);
  }
  if (frontmatter.selected_rubric) {
    lines.splice(frontmatter.selected_pack ? 5 : 4, 0, `Selected rubric: ${frontmatter.selected_rubric}`);
  }
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

export function writeCheckpoint(projectRoot, source = "auto") {
  ensureHarnessDirs(projectRoot);
  const status = readStatusDocument(projectRoot);
  if (!status) {
    return null;
  }

  const sprint = formatSprintNumber(status.frontmatter.current_sprint);
  const relatedFiles = [
    path.join(projectRoot, ".harness", "intake.md"),
    path.join(projectRoot, ".harness", "spec.md"),
    path.join(projectRoot, ".harness", "design-direction.md"),
    path.join(projectRoot, ".harness", "runtime.md"),
    path.join(projectRoot, ".harness", "contracts", `sprint-${sprint}-contract.md`),
    path.join(projectRoot, ".harness", "contracts", `sprint-${sprint}-review.md`),
    path.join(projectRoot, ".harness", "qa", `sprint-${sprint}-self-check.md`),
    path.join(projectRoot, ".harness", "qa", `sprint-${sprint}-qa-report.md`),
    path.join(projectRoot, ".harness", "qa", `sprint-${sprint}-fix-log.md`),
    path.join(projectRoot, ".harness", "qa", `sprint-${sprint}-retest.md`),
    path.join(projectRoot, ".harness", "final", "qa-final-report.md"),
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

  const checkpointPath = path.join(projectRoot, CHECKPOINT_FILE);
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
  fs.writeFileSync(checkpointPath, `${sections.join("\n")}\n`, "utf8");
  return checkpointPath;
}

export function readCheckpoint(projectRoot) {
  const filePath = path.join(projectRoot, CHECKPOINT_FILE);
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

export function readModuleDocument(pluginRoot, relativePath) {
  const filePath = path.join(pluginRoot, MODULES_DIR, relativePath);
  const document = readOptionalMarkdownDocument(filePath);
  if (!document) {
    return null;
  }
  return { path: filePath, ...document };
}

const SUBAGENT_BUNDLE_SPECS = {
  planner: [
    {
      name: "planner-protocols",
      directories: ["protocols"],
    },
    {
      name: "planner-clarification",
      directories: ["clarification"],
    },
    {
      name: "planner-catalogs",
      directories: ["catalogs"],
    },
    {
      name: "planner-templates",
      directories: ["templates"],
    },
    {
      name: "pack-library",
      directories: ["packs"],
    },
  ],
  generator: [
    {
      name: "generator-policy",
      directories: ["protocols", "templates"],
    },
    {
      name: "pack-library",
      directories: ["packs"],
    },
  ],
  evaluator: [
    {
      name: "evaluator-policy",
      directories: ["protocols", "templates"],
    },
    {
      name: "rubric-library",
      directories: ["rubrics"],
    },
    {
      name: "pack-library",
      directories: ["packs"],
    },
  ],
};

function normalizeFrontmatterList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  const raw = String(value ?? "").trim();
  if (!raw) {
    return [];
  }
  if (raw.startsWith("[") && raw.endsWith("]")) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) {
      return [];
    }
    return inner
      .split(",")
      .map((entry) => stripQuotes(entry.trim()))
      .filter(Boolean);
  }
  return [stripQuotes(raw)];
}

function moduleAppliesToRole(document, role) {
  const appliesTo = normalizeFrontmatterList(document.frontmatter.applies_to);
  if (appliesTo.length === 0) {
    return true;
  }
  return appliesTo.includes(role);
}

function listMarkdownRelativePaths(rootDir, currentDir = rootDir) {
  if (!fs.existsSync(currentDir)) {
    return [];
  }

  const entries = fs
    .readdirSync(currentDir, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  const results = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listMarkdownRelativePaths(rootDir, fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(path.relative(rootDir, fullPath).replace(/\\/g, "/"));
    }
  }

  return results;
}

function collectBundleDocuments(pluginRoot, directories, role) {
  const results = [];

  for (const directory of directories) {
    const absoluteDir = path.join(pluginRoot, MODULES_DIR, directory);
    const relativePaths = listMarkdownRelativePaths(absoluteDir);
    for (const relativePath of relativePaths) {
      const moduleRelativePath = `${directory}/${relativePath}`.replace(/\\/g, "/");
      const document = readModuleDocument(pluginRoot, moduleRelativePath);
      if (!document || !moduleAppliesToRole(document, role)) {
        continue;
      }
      results.push(document);
    }
  }

  return results;
}

function normalizeAgentType(agentType) {
  const raw = String(agentType ?? "").trim();
  if (!raw) {
    return "";
  }
  if (raw.includes(":")) {
    return raw.split(":").pop();
  }
  return raw;
}

function formatBundleTitle(name) {
  const titles = {
    "planner-protocols": "Planning Protocols",
    "planner-clarification": "Clarification Guidance",
    "planner-catalogs": "Architecture And Stack Catalogs",
    "planner-templates": "Planning Templates",
    "generator-policy": "Generator Guidance",
    "evaluator-policy": "Evaluator Guidance",
    "rubric-library": "Rubric Guidance",
    "pack-library": "Pack Guidance",
  };
  return titles[name] ?? name;
}

export function buildSubagentPolicyContext(pluginRoot, agentType) {
  const normalizedType = normalizeAgentType(agentType);
  const bundles = SUBAGENT_BUNDLE_SPECS[normalizedType];
  if (!bundles?.length) {
    return null;
  }

  const sections = [
    "[Auto-Harness Operating Guide]",
    `Role: ${normalizedType}`,
    "Use the guidance below as authoritative context for this run.",
  ];

  for (const bundle of bundles) {
    const documents = collectBundleDocuments(
      pluginRoot,
      bundle.directories,
      normalizedType,
    );
    if (documents.length === 0) {
      continue;
    }
    sections.push("");
    sections.push(`## ${formatBundleTitle(bundle.name)}`);
    for (const document of documents) {
      sections.push("");
      sections.push(document.body.trim());
    }
  }

  return sections.join("\n").trim();
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
