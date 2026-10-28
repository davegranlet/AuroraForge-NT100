const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(repoRoot, "docs");
const jsonOut = path.join(docsDir, "CAPABILITY-INVENTORY.json");
const mdOut = path.join(docsDir, "CAPABILITY-INVENTORY.md");

const skipDirs = new Set([
  ".git",
  ".git.embedded-backup",
  "bin",
  "node_modules",
  "obj",
  "build",
  "build-logs",
  "dist",
  "portable-release",
  "package-tests",
  "release",
  "releases",
  "sdcl-release",
  "external-source-imports",
]);

const scriptExtensions = new Set([".js", ".mjs", ".py", ".ps1", ".bat", ".cmd", ".cpp", ".hpp", ".h", ".c", ".cs", ".java", ".html", ".css"]);
const uiExtensions = new Set([".html"]);
const nativeExtensions = new Set([".cpp", ".hpp", ".h", ".c", ".cs"]);

function rel(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}

function readText(filePath, limit = 2_000_000) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > limit) return "";
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function walk(dir, output = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return output;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (skipDirs.has(entry.name)) continue;
      walk(full, output);
    } else if (entry.isFile()) {
      output.push(full);
    }
  }
  return output;
}

function topLevelOf(filePath) {
  const parts = rel(filePath).split("/");
  return parts[0] || "(root)";
}

function firstMeaningfulLine(markdown) {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  for (const line of lines) {
    if (!line || line.startsWith("#") || line.startsWith("!") || line.startsWith("[") || /^[-=*]{3,}$/.test(line)) continue;
    return line.replace(/\s+/g, " ").slice(0, 260);
  }
  return "";
}

function markdownHeadings(markdown, limit = 12) {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{1,4})\s+(.+?)\s*$/))
    .filter(Boolean)
    .map((match) => ({ level: match[1].length, text: match[2].replace(/[`*_]/g, "").trim() }))
    .filter((heading) => heading.text && !/^table of contents$/i.test(heading.text))
    .slice(0, limit);
}

function htmlTitle(html, filePath) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) return title[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return h1[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return path.basename(filePath, path.extname(filePath));
}

function htmlSignals(html) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const buttons = [...text.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 20);
  const nav = [...text.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 20);
  const headings = [...text.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 20);
  return { headings, buttons, links: nav };
}

function packageInfo(filePath) {
  try {
    const json = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return {
      path: rel(filePath),
      packageName: json.name || path.basename(path.dirname(filePath)),
      version: json.version || "",
      description: json.description || "",
      main: json.main || "",
      scripts: json.scripts || {},
      dependencies: Object.keys(json.dependencies || {}),
      devDependencies: Object.keys(json.devDependencies || {}),
    };
  } catch {
    return null;
  }
}

function extractFunctionNames(text, ext) {
  const names = new Set();
  const patterns = [];
  if ([".js", ".mjs", ".ts"].includes(ext)) {
    patterns.push(/\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g);
    patterns.push(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/g);
    patterns.push(/\b(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g);
    patterns.push(/module\.exports\s*=\s*\{([\s\S]*?)\}/g);
  } else if ([".py"].includes(ext)) {
    patterns.push(/^\s*def\s+([A-Za-z_][\w]*)\s*\(/gm);
    patterns.push(/^\s*class\s+([A-Za-z_][\w]*)\s*[:(]/gm);
  } else if (nativeExtensions.has(ext)) {
    patterns.push(/\b(?:class|struct)\s+([A-Za-z_][\w]*)\b/g);
    patterns.push(/\b(?:bool|void|int|auto|DWORD|HMODULE|HRESULT|std::[\w:<>]+)\s+([A-Za-z_][\w:]*)\s*\(/g);
  }
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) {
      if (match[1] && match[1].length < 80) names.add(match[1]);
    }
  }
  return [...names].slice(0, 30);
}

function keywordCapabilities(text) {
  const haystack = text.toLowerCase();
  const pairs = [
    ["authentication", ["patreon", "discord", "oauth", "entitlement", "access gate", "verify"]],
    ["cak archives", ["cak", "fdir", "tdb", "bake", "repack", "extract", "archive"]],
    ["mod loading", ["loader", "plugin", "addon", "hook", "minhook", "proxy", "datacrtllink"]],
    ["animation conversion", ["animation", "yanm", "acts", "clips", "entrance", "victory", "motion"]],
    ["texture/dds", ["dds", "texture", "normal map", "tex", "_textures.tdb"]],
    ["music/audio", ["music", "wwise", "bnk", "wem", "sound"]],
    ["ui/app shell", ["electron", "desktop", "preload", "ipc", "browserwindow"]],
    ["website/docs", ["website", "public", "faq", "tutorial", "knowledgebase", "release notes"]],
    ["build/release", ["build", "package", "portable", "release", "zip", "installer"]],
    ["reverse engineering", ["ghidra", "offset", "memory", "binary", "reverse", "probe"]],
    ["testing/validation", ["test", "verify", "validate", "diagnostic", "audit"]],
    ["creator studios", ["studio", "caw", "face", "mask", "belt", "arena", "gear"]],
  ];
  return pairs.filter(([, terms]) => terms.some((term) => haystack.includes(term))).map(([label]) => label);
}

function classifyPath(filePath, text = "") {
  const relative = rel(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();
  if (relative.includes("patreon") || relative.includes("access") || text.toLowerCase().includes("oauth")) return "Access / Entitlement";
  if (relative.includes("cak") || text.toLowerCase().includes("fdir")) return "CAK / Archive Tooling";
  if (relative.includes("loader") || relative.includes("secure-data") || relative.includes("datacrtllink")) return "Loader / Plugin Runtime";
  if (relative.includes("animation") || relative.includes("clips") || relative.includes("yanm") || relative.includes("entrance")) return "Animation / Motion Conversion";
  if (relative.includes("dds") || relative.includes("texture")) return "Texture / DDS Tooling";
  if (relative.includes("music") || relative.includes("wwise") || relative.includes("bnk")) return "Audio / Music Tooling";
  if (relative.includes("website") || relative.includes("docs") || ext === ".md") return "Docs / Website / Knowledge";
  if (relative.includes("studio") || relative.includes("caw") || relative.includes("face") || relative.includes("mask")) return "Creator Studio UI";
  if (relative.includes("test") || relative.includes("verify") || relative.includes("audit")) return "Tests / Verification";
  if (relative.includes("build") || relative.includes("package") || relative.includes("release")) return "Build / Release";
  if (nativeExtensions.has(ext)) return "Native Code";
  if (uiExtensions.has(ext)) return "UI Page";
  if ([".js", ".mjs", ".py", ".ps1"].includes(ext)) return "Script / Automation";
  return "General Source";
}

function summarizeToolFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const text = readText(filePath, 600_000);
  const category = classifyPath(filePath, text);
  return {
    path: rel(filePath),
    topLevel: topLevelOf(filePath),
    category,
    ext: ext || path.basename(filePath),
    functions: extractFunctionNames(text, ext),
    signals: keywordCapabilities(text),
  };
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

const files = walk(repoRoot);
const packageFiles = files.filter((file) => path.basename(file) === "package.json").map(packageInfo).filter(Boolean);
const readmes = files.filter((file) => /(^|[/\\])README\.md$/i.test(file)).map((file) => {
  const text = readText(file);
  return { path: rel(file), topLevel: topLevelOf(file), summary: firstMeaningfulLine(text), headings: markdownHeadings(text) };
});
const docs = files.filter((file) => [".md", ".txt"].includes(path.extname(file).toLowerCase())).map((file) => {
  const text = readText(file, 800_000);
  return { path: rel(file), topLevel: topLevelOf(file), category: classifyPath(file, text), summary: firstMeaningfulLine(text), headings: markdownHeadings(text, 8) };
});
const uiPages = files.filter((file) => uiExtensions.has(path.extname(file).toLowerCase())).map((file) => {
  const text = readText(file);
  return { path: rel(file), topLevel: topLevelOf(file), title: htmlTitle(text, file), category: classifyPath(file, text), ...htmlSignals(text), signals: keywordCapabilities(text) };
});
const toolFiles = files
  .filter((file) => scriptExtensions.has(path.extname(file).toLowerCase()))
  .filter((file) => !rel(file).startsWith("external-source-imports/"))
  .map(summarizeToolFile);

let importedManifest = null;
const importManifestPath = path.join(docsDir, "OUTER-SOURCE-IMPORT-MANIFEST.json");
if (fs.existsSync(importManifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(importManifestPath, "utf8"));
    importedManifest = {
      totalMappings: manifest.counts?.total || 0,
      uniqueHashes: manifest.counts?.uniqueHashes || 0,
      byOriginalTopLevel: manifest.byTopLevel || [],
    };
  } catch {}
}

const categories = countBy([...toolFiles, ...uiPages, ...docs], (item) => item.category || "Uncategorized");
const byTopLevel = countBy([...toolFiles, ...uiPages, ...docs], (item) => item.topLevel || "(root)");
const packagesByTopLevel = countBy(packageFiles, (item) => item.path.split("/")[0] || "(root)");

const result = {
  generatedAt: new Date().toISOString(),
  repoRoot,
  counts: {
    packages: packageFiles.length,
    readmes: readmes.length,
    docs: docs.length,
    uiPages: uiPages.length,
    toolFiles: toolFiles.length,
    stagedSourceImports: importedManifest?.uniqueHashes || 0,
  },
  categories,
  byTopLevel,
  packagesByTopLevel,
  packages: packageFiles,
  readmes,
  uiPages,
  toolFiles,
  docs,
  importedSource: importedManifest,
};

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(jsonOut, `${JSON.stringify(result, null, 2)}\n`);

const lines = [];
lines.push("# Capability Inventory");
lines.push("");
lines.push(`Generated: ${result.generatedAt}`);
lines.push("");
lines.push("This inventory is generated from the repository itself. It records visible capabilities from package metadata, UI pages, scripts, native code, docs, tests, and imported outer-root source blobs.");
lines.push("");
lines.push("## Counts");
lines.push("");
lines.push(`- Packages: ${result.counts.packages}`);
lines.push(`- UI pages: ${result.counts.uiPages}`);
lines.push(`- Script/native/source tool files: ${result.counts.toolFiles}`);
lines.push(`- Documentation/text files: ${result.counts.docs}`);
lines.push(`- README files: ${result.counts.readmes}`);
lines.push(`- Imported unique outer source blobs: ${result.counts.stagedSourceImports}`);
lines.push("");
lines.push("## Capability Categories");
lines.push("");
lines.push("| Category | Files |");
lines.push("| --- | ---: |");
for (const item of categories) lines.push(`| ${item.name} | ${item.count} |`);
lines.push("");
lines.push("## Top-Level Coverage");
lines.push("");
lines.push("| Area | Capability Files |");
lines.push("| --- | ---: |");
for (const item of byTopLevel.slice(0, 80)) lines.push(`| \`${item.name}\` | ${item.count} |`);
lines.push("");
lines.push("## Packages And Commands");
lines.push("");
for (const pkg of packageFiles.sort((a, b) => a.path.localeCompare(b.path))) {
  lines.push(`### ${pkg.packageName} ${pkg.version ? `(${pkg.version})` : ""}`);
  lines.push("");
  lines.push(`Path: \`${pkg.path}\``);
  if (pkg.description) lines.push(`Description: ${pkg.description}`);
  const scripts = Object.entries(pkg.scripts || {});
  if (scripts.length) {
    lines.push("");
    lines.push("| Command | Script |");
    lines.push("| --- | --- |");
    for (const [name, command] of scripts) lines.push(`| \`${name}\` | \`${String(command).replace(/\|/g, "\\|")}\` |`);
  }
  lines.push("");
}
lines.push("## UI Pages");
lines.push("");
lines.push("| Page | Title | Category | Main Signals |");
lines.push("| --- | --- | --- | --- |");
for (const page of uiPages.sort((a, b) => a.path.localeCompare(b.path)).slice(0, 250)) {
  lines.push(`| \`${page.path}\` | ${page.title || ""} | ${page.category} | ${(page.signals || []).join(", ")} |`);
}
if (uiPages.length > 250) lines.push(`| ... | ${uiPages.length - 250} more pages in JSON | | |`);
lines.push("");
lines.push("## Tool And Native Source Highlights");
lines.push("");
lines.push("| File | Category | Signals | Functions / Classes |");
lines.push("| --- | --- | --- | --- |");
for (const item of toolFiles
  .filter((tool) => tool.signals.length || tool.functions.length)
  .sort((a, b) => a.path.localeCompare(b.path))
  .slice(0, 350)) {
  lines.push(`| \`${item.path}\` | ${item.category} | ${item.signals.join(", ")} | ${item.functions.slice(0, 8).map((name) => `\`${name}\``).join(", ")} |`);
}
if (toolFiles.length > 350) lines.push(`| ... | More source files available in JSON | | |`);
lines.push("");
lines.push("## Imported Outer Source");
lines.push("");
if (importedManifest) {
  lines.push(`The repo contains ${importedManifest.uniqueHashes} unique imported source blobs covering ${importedManifest.totalMappings} original outer-root paths.`);
  lines.push("");
  lines.push("| Original Top-Level Folder | Files Mapped |");
  lines.push("| --- | ---: |");
  for (const item of importedManifest.byOriginalTopLevel.slice(0, 60)) lines.push(`| \`${item.name}\` | ${item.count} |`);
} else {
  lines.push("No outer-source import manifest found.");
}

fs.writeFileSync(mdOut, lines.join("\n"));

console.log(`Packages: ${result.counts.packages}`);
console.log(`UI pages: ${result.counts.uiPages}`);
console.log(`Tool/source files: ${result.counts.toolFiles}`);
console.log(`Docs/text files: ${result.counts.docs}`);
console.log(`Wrote ${rel(mdOut)}`);
console.log(`Wrote ${rel(jsonOut)}`);
