#!/usr/bin/env node
import path from "node:path";
import {
  ensureHarnessDirs,
  parseScalar,
  readStatusDocument,
  statusSummary,
  writeCheckpoint,
  writeMarkdownDocument,
} from "./harness-lib.mjs";

function usage() {
  console.error(
    "Usage: harness-state.mjs <get|summary|set|checkpoint> [projectRoot] [key=value ...]",
  );
  process.exit(1);
}

function resolveProjectRoot(rawValue) {
  if (!rawValue || rawValue.startsWith("--") || rawValue.includes("=")) {
    return process.cwd();
  }
  return path.resolve(rawValue);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const command = process.argv[2];
if (!command) {
  usage();
}

const maybeProjectRoot = process.argv[3];
const projectRoot = resolveProjectRoot(maybeProjectRoot);
const status = readStatusDocument(projectRoot);

if (command === "get") {
  if (!status) {
    printJson({ exists: false, projectRoot });
    process.exit(0);
  }
  printJson({
    exists: true,
    projectRoot,
    frontmatter: status.frontmatter,
    body: status.body,
  });
  process.exit(0);
}

if (command === "summary") {
  if (!status) {
    process.stdout.write("No active Auto-Harness state.\n");
    process.exit(0);
  }
  process.stdout.write(`${statusSummary(status.frontmatter)}\n`);
  process.exit(0);
}

if (command === "checkpoint") {
  const sourceArgIndex = maybeProjectRoot && !maybeProjectRoot.includes("=") ? 4 : 3;
  const source = process.argv[sourceArgIndex] ?? "auto";
  const checkpointPath = writeCheckpoint(projectRoot, source);
  if (!checkpointPath) {
    printJson({ exists: false, projectRoot });
    process.exit(0);
  }
  printJson({ exists: true, projectRoot, checkpointPath });
  process.exit(0);
}

if (command === "set") {
  if (!status) {
    console.error("Cannot update status: .harness/status.md does not exist.");
    process.exit(1);
  }

  const kvStartIndex = maybeProjectRoot && !maybeProjectRoot.includes("=") ? 4 : 3;
  const pairs = process.argv.slice(kvStartIndex);
  if (pairs.length === 0) {
    console.error("No key=value pairs provided.");
    process.exit(1);
  }

  ensureHarnessDirs(projectRoot);
  const nextFrontmatter = { ...status.frontmatter };
  const providedKeys = new Set();
  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) {
      console.error(`Invalid key=value pair: ${pair}`);
      process.exit(1);
    }
    const key = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    providedKeys.add(key);
    nextFrontmatter[key] = parseScalar(value);
  }
  if (!providedKeys.has("updated_at")) {
    nextFrontmatter.updated_at = new Date().toISOString();
  }

  writeMarkdownDocument(status.path, nextFrontmatter, status.body);
  printJson({
    exists: true,
    projectRoot,
    frontmatter: nextFrontmatter,
  });
  process.exit(0);
}

usage();
