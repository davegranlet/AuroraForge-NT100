const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(repoRoot, "docs");
const jsonOut = path.join(docsDir, "NESTED-GIT-REPOS-AUDIT.json");
const mdOut = path.join(docsDir, "NESTED-GIT-REPOS-AUDIT.md");

const skipDirs = new Set([
  ".git",
  ".git.embedded-backup",
  "node_modules",
  "build",
  "dist",
  "portable-release",
  "package-tests",
  "build-logs",
]);

function git(args, cwd) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    return "";
  }
}

function walk(dir, found = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name === ".git" && full !== path.join(repoRoot, ".git")) {
      found.push(path.dirname(full));
      continue;
    }
    if (skipDirs.has(entry.name)) continue;
    walk(full, found);
  }
  return found;
}

function countTrackedFiles(cwd) {
  const output = git(["ls-files"], cwd);
  return output ? output.split(/\r?\n/).filter(Boolean).length : 0;
}

function repoInfo(repoPath) {
  const relativePath = path.relative(repoRoot, repoPath).replace(/\\/g, "/");
  const status = git(["status", "--short"], repoPath);
  const remotes = git(["remote", "-v"], repoPath);
  const branch = git(["branch", "--show-current"], repoPath) || "(detached)";
  const head = git(["rev-parse", "HEAD"], repoPath);
  const origin = git(["config", "--get", "remote.origin.url"], repoPath);

  return {
    relativePath,
    absolutePath: repoPath,
    branch,
    head,
    origin,
    trackedFiles: countTrackedFiles(repoPath),
    dirty: Boolean(status),
    statusLines: status ? status.split(/\r?\n/) : [],
    remotes: remotes ? remotes.split(/\r?\n/) : [],
  };
}

function markdownReport(repos) {
  const lines = [];
  lines.push("# Nested Git Repositories Audit");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push("These embedded repositories block normal umbrella indexing. Git records them as repository links unless their nested `.git` metadata is moved out of the way.");
  lines.push("");
  lines.push(`Total nested repositories found: ${repos.length}`);
  lines.push("");
  lines.push("| Path | Branch | HEAD | Tracked files | Dirty | Origin |");
  lines.push("| --- | --- | --- | ---: | --- | --- |");
  for (const repo of repos) {
    const shortHead = repo.head ? repo.head.slice(0, 12) : "";
    const origin = repo.origin || "";
    lines.push(`| \`${repo.relativePath}\` | \`${repo.branch}\` | \`${shortHead}\` | ${repo.trackedFiles} | ${repo.dirty ? "yes" : "no"} | \`${origin}\` |`);
  }
  lines.push("");
  lines.push("## Dirty Repositories");
  lines.push("");
  const dirtyRepos = repos.filter((repo) => repo.dirty);
  if (!dirtyRepos.length) {
    lines.push("None.");
  } else {
    for (const repo of dirtyRepos) {
      lines.push(`### ${repo.relativePath}`);
      lines.push("");
      lines.push("```text");
      lines.push(...repo.statusLines.slice(0, 80));
      if (repo.statusLines.length > 80) lines.push(`... ${repo.statusLines.length - 80} more status lines`);
      lines.push("```");
      lines.push("");
    }
  }
  return lines.join("\n");
}

fs.mkdirSync(docsDir, { recursive: true });
const repos = walk(repoRoot).sort((a, b) => a.localeCompare(b)).map(repoInfo);
fs.writeFileSync(jsonOut, `${JSON.stringify({ generatedAt: new Date().toISOString(), repoRoot, repos }, null, 2)}\n`);
fs.writeFileSync(mdOut, markdownReport(repos));

console.log(`Nested repositories found: ${repos.length}`);
console.log(`Wrote ${path.relative(repoRoot, mdOut)}`);
console.log(`Wrote ${path.relative(repoRoot, jsonOut)}`);
