const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const outerRoot = path.resolve(__dirname, "..", "..");
const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(repoRoot, "docs");
const jsonOut = path.join(docsDir, "OUTER-SOURCE-COVERAGE-AUDIT.json");
const mdOut = path.join(docsDir, "OUTER-SOURCE-COVERAGE-AUDIT.md");

const sourceExtensions = new Set([
  ".bat", ".c", ".cc", ".cmd", ".config", ".cpp", ".cs", ".css", ".csproj",
  ".fs", ".fsproj", ".h", ".hh", ".hpp", ".html", ".ini", ".java", ".js",
  ".json", ".jsx", ".md", ".mjs", ".props", ".ps1", ".py", ".rs", ".sln",
  ".sql", ".targets", ".toml", ".ts", ".tsx", ".txt", ".vue", ".xml", ".yml",
  ".yaml",
]);

const sourceBasenames = new Set([
  ".gitattributes",
  ".gitignore",
  "dockerfile",
  "license",
  "makefile",
  "readme",
  "version",
]);

const skipDirs = new Set([
  ".aider.tags.cache.v4",
  ".git",
  ".git.embedded-backup",
  ".next",
  ".nuget",
  ".openai",
  ".tools",
  "__pycache__",
  "app.asar.unpacked",
  "bin",
  "build",
  "build-logs",
  "chatgpt-backups",
  "coverage",
  "dist",
  "localcache",
  "node_modules",
  "obj",
  "out",
  "package-tests",
  "portable-release",
  "release",
  "releases",
  "sdcl-release",
  "temp",
  "tmp",
]);

function rel(root, value) {
  return path.relative(root, value).replace(/\\/g, "/");
}

function isUnder(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isSourceFile(filePath) {
  if (isUnder(filePath, path.join(repoRoot, "external-source-imports", "by-hash"))) {
    return true;
  }
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath).toLowerCase();
  return sourceExtensions.has(ext) || sourceBasenames.has(base);
}

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function walk(root, options = {}, output = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return output;
  }

  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (options.excludeRepo && isUnder(full, repoRoot)) continue;
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name.toLowerCase())) continue;
      walk(full, options, output);
    } else if (entry.isFile() && isSourceFile(full)) {
      let stat;
      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }
      if (stat.size > 10 * 1024 * 1024) continue;
      output.push({
        path: full,
        relativeToOuter: rel(outerRoot, full),
        relativeToRepo: isUnder(full, repoRoot) ? rel(repoRoot, full) : null,
        bytes: stat.size,
        mtimeMs: stat.mtimeMs,
        hash: sha256(full),
      });
    }
  }
  return output;
}

function byHash(files) {
  const map = new Map();
  for (const file of files) {
    if (!map.has(file.hash)) map.set(file.hash, []);
    map.get(file.hash).push(file);
  }
  return map;
}

function topBy(items, key, limit = 80) {
  return [...items].sort((a, b) => String(a[key]).localeCompare(String(b[key]))).slice(0, limit);
}

fs.mkdirSync(docsDir, { recursive: true });

const repoFiles = walk(repoRoot);
const outerFiles = walk(outerRoot, { excludeRepo: true });
const repoHash = byHash(repoFiles);

const covered = [];
const missing = [];
for (const file of outerFiles) {
  const matches = repoHash.get(file.hash) || [];
  if (matches.length) {
    covered.push({ ...file, matches: matches.map((match) => match.relativeToRepo) });
  } else {
    missing.push(file);
  }
}

const duplicateGroups = [...repoHash.entries()]
  .map(([hash, files]) => ({ hash, files }))
  .filter((group) => group.files.length > 1)
  .sort((a, b) => b.files.length - a.files.length || a.hash.localeCompare(b.hash));

const result = {
  generatedAt: new Date().toISOString(),
  outerRoot,
  repoRoot,
  counts: {
    repoSourceFiles: repoFiles.length,
    outerSourceFilesOutsideRepo: outerFiles.length,
    coveredOuterSourceFiles: covered.length,
    missingOuterSourceFiles: missing.length,
    duplicateHashGroupsInsideRepo: duplicateGroups.length,
  },
  covered,
  missing,
  duplicateGroups: duplicateGroups.map((group) => ({
    hash: group.hash,
    files: group.files.map((file) => file.relativeToRepo),
  })),
};

fs.writeFileSync(jsonOut, `${JSON.stringify(result, null, 2)}\n`);

const lines = [];
lines.push("# Outer Source Coverage Audit");
lines.push("");
lines.push(`Generated: ${result.generatedAt}`);
lines.push("");
lines.push(`Repo source-like files: ${result.counts.repoSourceFiles}`);
lines.push(`Outer source-like files outside repo: ${result.counts.outerSourceFilesOutsideRepo}`);
lines.push(`Already covered by identical hash: ${result.counts.coveredOuterSourceFiles}`);
lines.push(`Missing from umbrella by hash: ${result.counts.missingOuterSourceFiles}`);
lines.push(`Duplicate hash groups inside umbrella: ${result.counts.duplicateHashGroupsInsideRepo}`);
lines.push("");
lines.push("## Missing Source Files Outside Umbrella");
lines.push("");
if (!missing.length) {
  lines.push("None.");
} else {
  lines.push("| Outer path | Bytes |");
  lines.push("| --- | ---: |");
  for (const file of topBy(missing, "relativeToOuter", 200)) {
    lines.push(`| \`${file.relativeToOuter}\` | ${file.bytes} |`);
  }
  if (missing.length > 200) lines.push(`| ... ${missing.length - 200} more in JSON | |`);
}
lines.push("");
lines.push("## Covered Outer Files");
lines.push("");
if (!covered.length) {
  lines.push("None.");
} else {
  lines.push("| Outer path | Matching umbrella file |");
  lines.push("| --- | --- |");
  for (const file of topBy(covered, "relativeToOuter", 120)) {
    lines.push(`| \`${file.relativeToOuter}\` | \`${file.matches[0]}\` |`);
  }
  if (covered.length > 120) lines.push(`| ... ${covered.length - 120} more in JSON | |`);
}
lines.push("");
lines.push("## Duplicate Hash Groups Inside Umbrella");
lines.push("");
if (!duplicateGroups.length) {
  lines.push("None.");
} else {
  for (const group of duplicateGroups.slice(0, 40)) {
    lines.push(`- ${group.files.length} copies of \`${group.hash.slice(0, 12)}\`: ${group.files.map((file) => `\`${file.relativeToRepo}\``).join(", ")}`);
  }
  if (duplicateGroups.length > 40) lines.push(`- ... ${duplicateGroups.length - 40} more groups in JSON`);
}

fs.writeFileSync(mdOut, lines.join("\n"));
console.log(`Repo source-like files: ${result.counts.repoSourceFiles}`);
console.log(`Outer source-like files outside repo: ${result.counts.outerSourceFilesOutsideRepo}`);
console.log(`Already covered: ${result.counts.coveredOuterSourceFiles}`);
console.log(`Missing from umbrella: ${result.counts.missingOuterSourceFiles}`);
console.log(`Wrote ${rel(repoRoot, mdOut)}`);
console.log(`Wrote ${rel(repoRoot, jsonOut)}`);
