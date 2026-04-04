#!/usr/bin/env node
import process from "node:process";
import {
  buildSubagentPolicyContext,
  readCheckpoint,
  readStatusDocument,
  resolvePluginRoot,
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
  payload = stdin.trim() ? JSON.parse(stdin) : {};
} catch {
  payload = {};
}

const projectRoot = payload.cwd || process.cwd();
const pluginRoot = resolvePluginRoot(process.env.CLAUDE_PLUGIN_ROOT);
const status = readStatusDocument(projectRoot);

if (mode === "subagent-start") {
  const additionalContext = buildSubagentPolicyContext(
    pluginRoot,
    payload.agent_type,
  );

  if (!additionalContext) {
    printJson({});
    process.exit(0);
  }

  printJson({
    hookSpecificOutput: {
      hookEventName: "SubagentStart",
      additionalContext,
    },
  });
  process.exit(0);
}

if (!status) {
  printJson({});
  process.exit(0);
}

if (mode === "session-start") {
  const checkpoint = readCheckpoint(projectRoot);
  const checkpointExcerpt = checkpoint
    ? checkpoint.split(/\r?\n/).slice(0, 18).join("\n").trim()
    : "No checkpoint file yet.";
  const additionalContext = [
    "[Auto-Harness Session Context]",
    `Project root: ${projectRoot}`,
    statusSummary(status.frontmatter),
    "",
    "Latest checkpoint excerpt:",
    checkpointExcerpt,
    "",
    "If the user wants to resume the harness, continue from .harness/status.md rather than restarting planning.",
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
  const checkpointPath = writeCheckpoint(projectRoot, payload.source || "auto");
  printJson({
    hookSpecificOutput: {
      hookEventName: "PreCompact",
      additionalContext: checkpointPath
        ? `Auto-Harness refreshed ${checkpointPath} before compaction.`
        : "Auto-Harness found no active status file during compaction.",
    },
  });
  process.exit(0);
}

printJson({});
