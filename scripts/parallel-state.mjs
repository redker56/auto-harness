#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import {
  CONTRACT_GRAPH_HEADING,
  STATUS_FILE,
  readJsonSectionFromMarkdownFileResult,
  readStatusDocument,
  readStatusParallelState,
  validateBuildGraph,
} from "./harness-lib.mjs";

function usage() {
  console.error(
    "Usage: parallel-state.mjs <graph-build|status|ready|all-merged> [args...]",
  );
  process.exit(1);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function resolveProjectRoot(rawValue) {
  return path.resolve(rawValue || process.cwd());
}

function normalizeNodeDefinitions(parallelState) {
  if (!Array.isArray(parallelState?.node_definitions) || !parallelState.node_definitions.length) {
    return null;
  }
  return parallelState.node_definitions.map((rawNode) => ({
    id: String(rawNode?.id ?? "").trim(),
    title: String(rawNode?.title ?? "").trim(),
    goal: String(rawNode?.goal ?? "").trim(),
    owned_paths: Array.isArray(rawNode?.owned_paths)
      ? rawNode.owned_paths.map((value) => String(value).trim()).filter(Boolean)
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
  }));
}

function readGraphFromState(projectRoot, parallelState) {
  const nodeDefinitions = normalizeNodeDefinitions(parallelState);
  if (nodeDefinitions) {
    return {
      kind: String(parallelState?.mode ?? "").includes("fix") ? "fix" : "build",
      data: { nodes: nodeDefinitions },
      validation: { errors: [], nodes: nodeDefinitions },
    };
  }
  const graphSource = parallelState?.graph_source;
  if (!graphSource) {
    return { kind: null, data: null, validation: { errors: ["parallel state is missing graph_source."], nodes: [] } };
  }
  const absolutePath = path.resolve(projectRoot, graphSource);
  if (absolutePath.includes(`${path.sep}.harness${path.sep}qa${path.sep}`)) {
    return {
      kind: "fix",
      data: null,
      validation: {
        errors: ["parallel fix state must include temporary node_definitions derived from the QA or retest bug table."],
        nodes: [],
      },
    };
  }
  const result = readJsonSectionFromMarkdownFileResult(absolutePath, CONTRACT_GRAPH_HEADING);
  if (!result.ok) {
    return {
      kind: "build",
      data: null,
      validation: { errors: [result.error], nodes: [] },
    };
  }
  return { kind: "build", data: result.data, validation: validateBuildGraph(result.data) };
}

function computeReadyNodes(parallelState, nodes) {
  const merged = new Set(
    Object.entries(parallelState?.nodes ?? {})
      .filter(([, status]) => status === "merged")
      .map(([nodeId]) => nodeId),
  );
  const ready = [];
  for (const node of nodes) {
    const status = parallelState?.nodes?.[node.id] ?? "queued";
    if (!["queued", "failed"].includes(status)) {
      continue;
    }
    const depsSatisfied = (node.depends_on ?? []).every((dependency) => merged.has(dependency));
    if (depsSatisfied) {
      ready.push(node);
    }
  }
  return ready;
}

const command = process.argv[2];
if (!command) {
  usage();
}

if (command === "graph-build") {
  const target = process.argv[3];
  if (!target) {
    usage();
  }
  const absolutePath = path.resolve(target);
  const result = readJsonSectionFromMarkdownFileResult(absolutePath, CONTRACT_GRAPH_HEADING);
  const validation = result.ok
    ? validateBuildGraph(result.data)
    : { errors: [result.error], nodes: [] };
  printJson({
    ok: validation.errors.length === 0,
    file: absolutePath,
    heading: CONTRACT_GRAPH_HEADING,
    errors: validation.errors,
    nodes: validation.nodes,
  });
  process.exit(validation.errors.length === 0 ? 0 : 1);
}

if (command === "status") {
  const projectRoot = resolveProjectRoot(process.argv[3]);
  const status = readStatusDocument(projectRoot);
  printJson({
    exists: Boolean(status),
    projectRoot,
    statusPath: path.join(projectRoot, STATUS_FILE),
    frontmatter: status?.frontmatter ?? null,
    parallel_state: readStatusParallelState(projectRoot),
  });
  process.exit(0);
}

if (command === "ready") {
  const projectRoot = resolveProjectRoot(process.argv[3]);
  const parallelState = readStatusParallelState(projectRoot);
  if (!parallelState) {
    printJson({
      ok: false,
      projectRoot,
      reason: "Parallel execution state not found in .harness/status.md.",
    });
    process.exit(1);
  }
  const graph = readGraphFromState(projectRoot, parallelState);
  if (graph.validation.errors.length > 0) {
    printJson({
      ok: false,
      projectRoot,
      graph_source: parallelState.graph_source,
      errors: graph.validation.errors,
    });
    process.exit(1);
  }
  const ready = computeReadyNodes(parallelState, graph.validation.nodes);
  printJson({
    ok: true,
    projectRoot,
    mode: parallelState.mode ?? graph.kind,
    graph_source: parallelState.graph_source,
    ready_nodes: ready,
    merge_queue: parallelState.merge_queue ?? [],
    merge_history: parallelState.merge_history ?? [],
  });
  process.exit(0);
}

if (command === "all-merged") {
  const projectRoot = resolveProjectRoot(process.argv[3]);
  const parallelState = readStatusParallelState(projectRoot);
  if (!parallelState) {
    printJson({ ok: false, projectRoot, reason: "Parallel execution state not found." });
    process.exit(1);
  }
  const graph = readGraphFromState(projectRoot, parallelState);
  if (graph.validation.errors.length > 0) {
    printJson({
      ok: false,
      projectRoot,
      graph_source: parallelState.graph_source,
      errors: graph.validation.errors,
    });
    process.exit(1);
  }
  const allMerged = graph.validation.nodes.every(
    (node) => parallelState.nodes?.[node.id] === "merged",
  );
  printJson({
    ok: true,
    projectRoot,
    graph_source: parallelState.graph_source,
    all_merged: allMerged,
  });
  process.exit(allMerged ? 0 : 1);
}

usage();
