#!/usr/bin/env node
import path from "node:path";
import { httpGet, readRuntimeDocument, SERIAL_HARNESS_DIR } from "./harness-lib.mjs";

function usage() {
  console.error("Usage: harness-runtime.mjs <get|healthcheck> [projectRoot] [harnessDir]");
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

const command = process.argv[2];
if (!command) {
  usage();
}

const projectRoot = resolveProjectRoot(process.argv[3]);
const harnessDir = process.argv[4] || SERIAL_HARNESS_DIR;
const runtime = readRuntimeDocument(projectRoot, harnessDir);

if (command === "get") {
  if (!runtime) {
    printJson({ exists: false, projectRoot });
    process.exit(0);
  }
  printJson({
    exists: true,
    projectRoot,
    harnessDir,
    frontmatter: runtime.frontmatter,
    body: runtime.body,
  });
  process.exit(0);
}

if (command === "healthcheck") {
  if (!runtime) {
    printJson({
      exists: false,
      ok: false,
      reason: `${harnessDir}/runtime.md not found`,
      projectRoot,
      harnessDir,
    });
    process.exit(1);
  }

  const method = runtime.frontmatter.healthcheck_method;
  const url = runtime.frontmatter.healthcheck_url || runtime.frontmatter.access_url;
  if (method !== "http-get" || !url) {
    printJson({
      exists: true,
      ok: false,
      reason: "Unsupported or missing healthcheck configuration",
      projectRoot,
      harnessDir,
      frontmatter: runtime.frontmatter,
    });
    process.exit(1);
  }

  try {
    const result = await httpGet(url);
    printJson({
      exists: true,
      projectRoot,
      harnessDir,
      ...result,
    });
    process.exit(result.ok ? 0 : 1);
  } catch (error) {
    printJson({
      exists: true,
      ok: false,
      projectRoot,
      harnessDir,
      reason: error instanceof Error ? error.message : String(error),
      frontmatter: runtime.frontmatter,
    });
    process.exit(1);
  }
}

usage();
