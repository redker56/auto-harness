#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

function usage() {
  console.error(
    "Usage: worktree-manager.mjs <add|snapshot|remove|prune|head> [args...]",
  );
  process.exit(1);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function runGit(projectRoot, args) {
  const result = spawnSync("git", ["-C", projectRoot, ...args], {
    encoding: "utf8",
  });
  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? "",
    stderr: result.stderr?.trim() ?? "",
  };
}

function resolveAbsolute(rawValue) {
  return path.resolve(rawValue);
}

function markReadonly(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }
  const stats = fs.statSync(targetPath);
  fs.chmodSync(targetPath, stats.isDirectory() ? 0o555 : 0o444);
}

function markWritable(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return;
  }
  const stats = fs.statSync(targetPath);
  fs.chmodSync(targetPath, stats.isDirectory() ? 0o755 : 0o644);
}

function walkRecursive(rootPath, visitor) {
  if (!fs.existsSync(rootPath)) {
    return;
  }
  for (const filePath of fs.readdirSync(rootPath, { recursive: true })) {
    visitor(path.join(rootPath, filePath));
  }
}

function copyHarnessSnapshot(projectRoot, worktreePath) {
  const source = path.join(projectRoot, ".harness");
  const target = path.join(worktreePath, ".harness");
  fs.rmSync(target, { recursive: true, force: true });
  if (!fs.existsSync(source)) {
    fs.mkdirSync(target, { recursive: true });
    markReadonly(target);
    return { copied: false, source, target };
  }
  fs.cpSync(source, target, { recursive: true, force: true });
  markReadonly(target);
  walkRecursive(target, markReadonly);
  return { copied: true, source, target };
}

function cleanupHarnessSnapshot(worktreePath) {
  const target = path.join(worktreePath, ".harness");
  if (!fs.existsSync(target)) {
    return false;
  }
  walkRecursive(target, markWritable);
  markWritable(target);
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}

const command = process.argv[2];
if (!command) {
  usage();
}

if (command === "add") {
  const projectRoot = resolveAbsolute(process.argv[3]);
  const worktreePath = resolveAbsolute(process.argv[4]);
  const branchName = process.argv[5];
  const baseRef = process.argv[6] || "HEAD";
  if (!projectRoot || !worktreePath || !branchName) {
    usage();
  }
  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  const result = runGit(projectRoot, ["worktree", "add", "-b", branchName, worktreePath, baseRef]);
  printJson({
    projectRoot,
    worktreePath,
    branchName,
    baseRef,
    ...result,
  });
  process.exit(result.ok ? 0 : 1);
}

if (command === "snapshot") {
  const projectRoot = resolveAbsolute(process.argv[3]);
  const worktreePath = resolveAbsolute(process.argv[4]);
  if (!projectRoot || !worktreePath) {
    usage();
  }
  const snapshot = copyHarnessSnapshot(projectRoot, worktreePath);
  printJson({
    ok: true,
    projectRoot,
    worktreePath,
    ...snapshot,
  });
  process.exit(0);
}

if (command === "remove") {
  const projectRoot = resolveAbsolute(process.argv[3]);
  const worktreePath = resolveAbsolute(process.argv[4]);
  if (!projectRoot || !worktreePath) {
    usage();
  }
  const cleanedHarnessSnapshot = cleanupHarnessSnapshot(worktreePath);
  const result = runGit(projectRoot, ["worktree", "remove", "--force", worktreePath]);
  printJson({
    projectRoot,
    worktreePath,
    cleanedHarnessSnapshot,
    ...result,
  });
  process.exit(result.ok ? 0 : 1);
}

if (command === "prune") {
  const projectRoot = resolveAbsolute(process.argv[3]);
  if (!projectRoot) {
    usage();
  }
  const result = runGit(projectRoot, ["worktree", "prune"]);
  printJson({
    projectRoot,
    ...result,
  });
  process.exit(result.ok ? 0 : 1);
}

if (command === "head") {
  const worktreePath = resolveAbsolute(process.argv[3]);
  if (!worktreePath) {
    usage();
  }
  const branch = spawnSync("git", ["-C", worktreePath, "branch", "--show-current"], {
    encoding: "utf8",
  });
  const commit = spawnSync("git", ["-C", worktreePath, "rev-parse", "HEAD"], {
    encoding: "utf8",
  });
  const ok = branch.status === 0 && commit.status === 0;
  printJson({
    ok,
    worktreePath,
    branch: branch.stdout?.trim() ?? "",
    commit: commit.stdout?.trim() ?? "",
    stderr: [branch.stderr, commit.stderr].filter(Boolean).join("\n").trim(),
  });
  process.exit(ok ? 0 : 1);
}

usage();
