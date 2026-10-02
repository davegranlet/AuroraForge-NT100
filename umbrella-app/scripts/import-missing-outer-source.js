const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const repoRoot = path.resolve(__dirname, "..");
const auditPath = path.join(repoRoot, "docs", "OUTER-SOURCE-COVERAGE-AUDIT.json");
const importRoot = path.join(repoRoot, "external-source-imports", "by-hash");
const manifestPath = path.join(repoRoot, "docs", "OUTER-SOURCE-IMPORT-MANIFEST.json");
const manifestMdPath = path.join(repoRoot, "docs", "OUTER-SOURCE-IMPORT-MANIFEST.md");

function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function ensureInside(child, parent) {
  const relative = path.relative(parent, child);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to write outside import root: ${child}`);
  }
}

function safeBasename(file) {
  const original = path.basename(file.relativeToOuter).replace(/[^A-Za-z0-9._-]/g, "_");
  return original || "source.txt";
}

function copyMissing(file) {
  const dest = path.join(importRoot, file.hash.slice(0, 2), `${file.hash}-${safeBasename(file)}`);
  ensureInside(dest, importRoot);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (fs.existsSync(dest) && sha256(dest) === file.hash) {
    return { action: "already-present", source: file.path, dest, hash: file.hash, bytes: file.bytes };
  }

  fs.copyFileSync(file.path, dest);
  const copiedHash = sha256(dest);
  if (copiedHash !== file.hash) {
    throw new Error(`Hash mismatch after copy: ${file.path}`);
  }
  return { action: "copied", source: file.path, dest, hash: file.hash, bytes: file.bytes };
}

if (!fs.existsSync(auditPath)) {
  throw new Error(`Missing audit. Run scripts/audit-outer-source-coverage.js first: ${auditPath}`);
}

const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
fs.mkdirSync(importRoot, { recursive: true });

const imported = [];
const copiedHashes = new Set();
for (const file of audit.missing) {
  if (copiedHashes.has(file.hash)) {
    const dest = path.join(importRoot, file.hash.slice(0, 2), `${file.hash}-${safeBasename(file)}`);
    imported.push({ action: "hash-already-imported", source: file.path, dest, hash: file.hash, bytes: file.bytes });
    continue;
  }
  imported.push(copyMissing(file));
  copiedHashes.add(file.hash);
}

const grouped = new Map();
for (const item of imported) {
  const rel = path.relative(importRoot, item.dest).replace(/\\/g, "/");
  const top = rel.split("/")[0] || "(root)";
  grouped.set(top, (grouped.get(top) || 0) + 1);
}

const manifest = {
  generatedAt: new Date().toISOString(),
  importRoot,
  auditPath,
  counts: {
    total: imported.length,
    copied: imported.filter((item) => item.action === "copied").length,
    alreadyPresent: imported.filter((item) => item.action === "already-present").length,
    hashAlreadyImported: imported.filter((item) => item.action === "hash-already-imported").length,
    uniqueHashes: copiedHashes.size,
  },
  byTopLevel: [...grouped.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  files: imported.map((item) => ({
    action: item.action,
    source: item.source,
    dest: item.dest,
    hash: item.hash,
    bytes: item.bytes,
  })),
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const lines = [];
lines.push("# Outer Source Import Manifest");
lines.push("");
lines.push(`Generated: ${manifest.generatedAt}`);
lines.push("");
lines.push(`Imported source files: ${manifest.counts.total}`);
lines.push(`Unique source blobs: ${manifest.counts.uniqueHashes}`);
lines.push(`Copied now: ${manifest.counts.copied}`);
lines.push(`Already present: ${manifest.counts.alreadyPresent}`);
lines.push(`Reused imported hash: ${manifest.counts.hashAlreadyImported}`);
lines.push("");
lines.push("## By Original Top-Level Folder");
lines.push("");
lines.push("| Folder | Files |");
lines.push("| --- | ---: |");
for (const item of manifest.byTopLevel) {
  lines.push(`| \`${item.name}\` | ${item.count} |`);
}
lines.push("");
lines.push("The imported files are stored once by content hash under `external-source-imports/by-hash/`. The JSON manifest maps every original outer-root path to its tracked source blob. This makes the umbrella repository the tracked source of record while keeping old archive/workspace material quarantined from the active app.");
fs.writeFileSync(manifestMdPath, lines.join("\n"));

console.log(`Imported source files: ${manifest.counts.total}`);
console.log(`Copied now: ${manifest.counts.copied}`);
console.log(`Already present: ${manifest.counts.alreadyPresent}`);
console.log(`Wrote ${path.relative(repoRoot, manifestMdPath)}`);
console.log(`Wrote ${path.relative(repoRoot, manifestPath)}`);
