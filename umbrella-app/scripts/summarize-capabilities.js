const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const inventoryPath = path.join(repoRoot, "docs", "CAPABILITY-INVENTORY.json");
const outPath = path.join(repoRoot, "docs", "AURORA-FORGE-CAPABILITY-MAP.md");

function loadInventory() {
  if (!fs.existsSync(inventoryPath)) {
    throw new Error("Run scripts/audit-capabilities.js before summarizing capabilities.");
  }
  return JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
}

function pathsMatching(inventory, patterns) {
  const all = [
    ...(inventory.packages || []),
    ...(inventory.uiPages || []),
    ...(inventory.toolFiles || []),
    ...(inventory.docs || []),
  ];
  const seen = new Set();
  return all
    .filter((item) => patterns.some((pattern) => pattern.test(item.path || "")))
    .filter((item) => {
      if (seen.has(item.path)) return false;
      seen.add(item.path);
      return true;
    })
    .map((item) => item.path)
    .sort();
}

function scriptsFor(inventory, pattern) {
  return (inventory.packages || [])
    .filter((pkg) => pattern.test(pkg.path))
    .flatMap((pkg) => Object.entries(pkg.scripts || {}).map(([name, command]) => `\`${name}\`: \`${String(command)}\``));
}

function section(lines, title, bullets) {
  lines.push(`## ${title}`);
  lines.push("");
  for (const bullet of bullets) lines.push(`- ${bullet}`);
  lines.push("");
}

const inventory = loadInventory();
const imported = inventory.importedSource || {};
const lines = [];

lines.push("# Aurora Forge Capability Map");
lines.push("");
lines.push(`Generated: ${new Date().toISOString()}`);
lines.push("");
lines.push("This is the short human map of what the tracked AuroraForge umbrella repo can currently do, generated from the code inventory. The full machine-readable index is `docs/CAPABILITY-INVENTORY.json`.");
lines.push("");
lines.push("## Inventory Totals");
lines.push("");
lines.push(`- Packages with commands: ${inventory.counts.packages}`);
lines.push(`- UI pages: ${inventory.counts.uiPages}`);
lines.push(`- Script/native/source tool files: ${inventory.counts.toolFiles}`);
lines.push(`- Documentation/text files: ${inventory.counts.docs}`);
lines.push(`- Preserved unique outer-root source blobs: ${inventory.counts.stagedSourceImports}`);
lines.push(`- Original outer-root paths mapped to preserved source blobs: ${imported.totalMappings || 0}`);
lines.push("");

section(lines, "Main App Shell And Navigation", [
  "Electron desktop shell, preload bridge, access gate, home/dashboard, project manager, tool center, setup, FAQ, about, tutorials placeholder, docs and knowledgebase pages.",
  "Creator workflow pages for CAW/character building, face texture work, mask/logo/belt/gear/arena/faction ideas, mod suite/workshop, file inspection, CAK/PAC/DDS explorers, and tutorial/handbook surfaces.",
  `Representative files: ${pathsMatching(inventory, [/^app\//, /^electron\//]).slice(0, 18).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "Access And Entitlement", [
  "Cloudflare Worker Patreon verification, Discord OAuth/role-gated unlock flow, access-gate client checks, release-persistent entitlement handling, and verifier tests/docs.",
  "The intended unlock model is two-tier: Patreon active tier plus linked Discord role, with release-specific persistent unlock in the desktop app.",
  `Representative files: ${pathsMatching(inventory, [/Patreon-Verifier/i, /access-gate/i, /patreon-access/i, /entitlement/i]).slice(0, 20).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "CAK Archive Foundry", [
  "CAK extraction, protected CAK writing, BakeMe folder scanning, archive repackaging, FDIR v9/v93 handling, payload protection/recovery, catalog verification, hash roundtrips, raw extraction checks, and bake CLI/build helpers.",
  `Commands: ${scriptsFor(inventory, /Aurora-CAK-Foundry\/package\.json/).join("; ")}.`,
  `Representative files: ${pathsMatching(inventory, [/Aurora-CAK-Foundry/, /cak/i]).slice(0, 28).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "WWE 2K26 Loader And Plugins", [
  "Secure DataCtrlLink WWE 2K26 loader/plugin runtime, addon registry, addon selection, mod loader hooks, loader diagnostics, profile support, and current WWE 2K26 status docs.",
  "WWE 2K25 loader code is also tracked for comparison and upgrade reference.",
  `Representative files: ${pathsMatching(inventory, [/Secure-DataCtrlLink-WWE2K26/, /Secure-DataCtrlLink-WWE2K25/, /CAK-Mod-Loader/]).slice(0, 32).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "Animation And Motion Conversion", [
  "WWE 2K19/2K20/2K25/2K26 animation research and conversion pipeline pieces: YANM/ACTS/EVD/FOP readers/writers, group90 encoding, JSFB patching, entrance/victory list tooling, clips staging/building, and corpus/probe utilities.",
  `Commands: ${scriptsFor(inventory, /WWE2K19-to-2K26-Entrance-Prototype|2K19-to-2K20-Converter/).join("; ") || "see individual tools and tests in the animation prototype folders"}.`,
  `Representative files: ${pathsMatching(inventory, [/WWE2K19-to-2K26/, /2K19-to-2K20/, /Animation-Probes/, /Clips/]).slice(0, 36).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "Texture And DDS Tooling", [
  "DDS conversion workflow, texture-related CAK handling, normal map/shader helper UI, DDS converter app/page, texture database awareness, and texture replacement bake support.",
  `Commands: ${scriptsFor(inventory, /DDS-Converter\/package\.json/).join("; ")}.`,
  `Representative files: ${pathsMatching(inventory, [/DDS/i, /texture/i, /normal-map/i]).slice(0, 24).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "Audio And Music Tooling", [
  "Custom music loader projects for WWE 2K25/general loader work, Wwise/BNK/WEM parser utilities, wwiser and wwiser-utils support code, bnk extraction helpers, and audio name/database support files.",
  `Representative files: ${pathsMatching(inventory, [/Music/i, /wwise/i, /wwiser/i, /bnk/i, /WwiseParser/]).slice(0, 32).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "2K19 PAC And Legacy Converters", [
  "2K19 PAC inspection/extraction, 2K19 menu payload decoding, 2K19-to-2K20 converter tooling, and legacy research utilities needed for cross-generation workflows.",
  `Commands: ${scriptsFor(inventory, /2K19-PAC-Tools|2K19-to-2K20/).join("; ")}.`,
  `Representative files: ${pathsMatching(inventory, [/2K19-PAC/, /2K19-to-2K20/, /pac19/i]).slice(0, 24).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "Creator Studios And Prompt/Workflow Builders", [
  "In-app creative pages for CAW, face textures, L-mask/luchador masks, logos/emblems, belts, gear, arenas/rings, factions, tattoo pipeline, material/fabric help, project management, and guided workflows.",
  `Representative files: ${pathsMatching(inventory, [/studio/i, /caw/i, /face/i, /mask/i, /gear/i, /arena/i, /faction/i, /tattoo/i]).slice(0, 34).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "Build, Release, Website, And Publishing Support", [
  "Portable app packaging scripts, release verification docs, release notes, website source, public post drafts, and package/release metadata.",
  `Representative files: ${pathsMatching(inventory, [/build/i, /release/i, /website/i, /package/i, /PUBLIC_POSTS/]).slice(0, 34).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "Reverse Engineering And Research", [
  "Ghidra NativeAOT helper/plugin code, Cake/Bakery references, decompiler/reverse-analysis artifacts, memory/offset/probe scripts, and preserved research snapshots.",
  "Third-party research/tooling is tracked where it supports the AuroraForge app, with original source copies preserved where they existed in the Aug26 workspace.",
  `Representative files: ${pathsMatching(inventory, [/ghidra/i, /Bakery/, /reverse/i, /probe/i, /offset/i, /research/i]).slice(0, 34).map((p) => `\`${p}\``).join(", ")}.`,
]);

section(lines, "Validation And Audit Infrastructure", [
  "Repo coverage audits, nested git flattening reports, outer-source hash coverage, capability inventory generation, CAK verifiers, unit tests, runtime config tests, loader/mod manifest tests, and source provenance reports.",
  `Representative files: ${pathsMatching(inventory, [/audit/i, /verify/i, /test/i, /coverage/i, /manifest/i]).slice(0, 34).map((p) => `\`${p}\``).join(", ")}.`,
]);

lines.push("## Preservation Note");
lines.push("");
lines.push("The `external-source-imports/by-hash/` area is not active product code. It is a compact source-preservation vault. The manifest maps old `_work`, `_archive`, `_tools`, `_worktrees`, `latest`, and other outer-root source paths to their tracked hash blobs so cleanup can happen without losing code.");
lines.push("");

fs.writeFileSync(outPath, lines.join("\n"));
console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
