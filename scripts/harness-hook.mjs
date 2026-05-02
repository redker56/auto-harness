#!/usr/bin/env node
import process from "node:process";
import {
  PARALLEL_HARNESS_DIR,
  SERIAL_HARNESS_DIR,
  readCheckpoint,
  readStatusDocument,
  statusSummary,
  writeCheckpoint,
} from "./harness-lib.mjs";

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data);
    });
    process.stdin.resume();
  });
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const mode = process.argv[2];
if (!mode) {
  printJson({});
  process.exit(0);
}

let payload = {};
try {
  const stdin = await readStdin();
  const normalized = stdin.replace(/^\uFEFF/, "").trim();
  payload = normalized ? JSON.parse(normalized) : {};
} catch {
  payload = {};
}

const projectRoot = payload.cwd || process.cwd();
const statusEntries = [
  { mode: "serial", command: "/auto-harness:harness", harnessDir: SERIAL_HARNESS_DIR },
  { mode: "parallel", command: "/auto-harness:harness-parallel", harnessDir: PARALLEL_HARNESS_DIR },
]
  .map((entry) => ({
    ...entry,
    status: readStatusDocument(projectRoot, entry.harnessDir),
  }))
  .filter((entry) => Boolean(entry.status));

if (!statusEntries.length) {
  printJson({});
  process.exit(0);
}

if (mode === "session-start") {
  const blocks = [];
  for (const entry of statusEntries) {
    const checkpoint = readCheckpoint(projectRoot, entry.harnessDir);
    const checkpointExcerpt = checkpoint
      ? checkpoint.split(/\r?\n/).slice(0, 12).join("\n").trim()
      : "No checkpoint file yet.";
    blocks.push(
      [
        `Mode: ${entry.mode}`,
        `Harness dir: ${entry.harnessDir}`,
        `Resume command: ${entry.command}`,
        statusSummary(entry.status.frontmatter),
        "",
        "Latest checkpoint excerpt:",
        checkpointExcerpt,
      ].join("\n"),
    );
  }
  const additionalContext = [
    "[Auto-Harness Session Context]",
    `Project root: ${projectRoot}`,
    "",
    blocks.join("\n\n---\n\n"),
    "",
    "If the user wants to resume a harness, continue from the matching harness directory and command rather than restarting planning.",
  ].join("\n");

  printJson({
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext,
    },
  });
  process.exit(0);
}

if (mode === "pre-compact") {
  const checkpointPaths = statusEntries
    .map((entry) => writeCheckpoint(projectRoot, payload.source || "auto", entry.harnessDir))
    .filter(Boolean);
  printJson({
    hookSpecificOutput: {
      hookEventName: "PreCompact",
      additionalContext: checkpointPaths.length
        ? `Auto-Harness refreshed ${checkpointPaths.join(", ")} before compaction.`
        : "Auto-Harness found no active status file during compaction.",
    },
  });
  process.exit(0);
}

printJson({});
