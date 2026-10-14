const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const root = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const repo = path.resolve(process.argv[3] || path.join(root, 'AuroraForge_WWE_PC-Game_Modding_Tool'));

const SKIP_NAMES = new Set([
  '.git',
  '.aider.tags.cache.v4',
  'node_modules',
  'dist',
  'build',
  'portable-release',
  'build-logs',
  'temp',
]);

const OUTER_SKIP_NAMES = new Set([
  '.git',
  '.aider.tags.cache.v4',
  'AuroraForge_WWE_PC-Game_Modding_Tool',
]);

function statSafe(target) {
  try {
    return fs.statSync(target);
  } catch {
    return null;
  }
}

function listTop(directory, skipNames = new Set()) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => !skipNames.has(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
    .map((entry) => {
      const fullPath = path.join(directory, entry.name);
      const stat = statSafe(fullPath);
      return {
        name: entry.name,
        kind: entry.isDirectory() ? 'dir' : 'file',
        path: fullPath,
        bytes: entry.isFile() && stat ? stat.size : 0,
        lastWriteTime: stat ? stat.mtime.toISOString() : null,
      };
    });
}

function walkSummary(target, rootName = path.basename(target)) {
  const stack = [target];
  let files = 0;
  let dirs = 0;
  let bytes = 0;
  let skipped = 0;
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      skipped += 1;
      continue;
    }
    for (const entry of entries) {
      if (SKIP_NAMES.has(entry.name)) {
        skipped += 1;
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isSymbolicLink()) {
        skipped += 1;
        continue;
      }
      if (entry.isDirectory()) {
        dirs += 1;
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files += 1;
        const stat = statSafe(fullPath);
        if (stat) bytes += stat.size;
      }
    }
  }
  return { name: rootName, files, dirs, bytes, skipped };
}

function gitLines(args) {
  try {
    return cp.execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function topNameFromGitPath(file) {
  return file.split(/[\\/]/)[0];
}

function fmtBytes(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${bytes} B`;
}

function markdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(' |')} |`;
  const separator = `| ${columns.map(() => '---').join(' |')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.value(row)).replace(/\|/g, '\\|')).join(' |')} |`);
  return [header, separator, ...body].join('\n');
}

function main() {
  if (!fs.existsSync(root)) throw new Error(`Root not found: ${root}`);
  if (!fs.existsSync(repo)) throw new Error(`Umbrella repo not found: ${repo}`);

  const outer = listTop(root, OUTER_SKIP_NAMES);
  const inner = listTop(repo, new Set(['.git']));
  const innerNames = new Set(inner.map((item) => item.name));
  const outerNames = new Set(outer.map((item) => item.name));
  const missingFromUmbrella = outer.filter((item) => !innerNames.has(item.name));
  const presentInUmbrella = outer.filter((item) => innerNames.has(item.name));
  const umbrellaOnly = inner.filter((item) => !outerNames.has(item.name));

  const trackedFiles = gitLines(['ls-files']);
  const statusLines = gitLines(['status', '--short']);
  const untrackedTop = [...new Set(statusLines
    .filter((line) => line.startsWith('?? '))
    .map((line) => topNameFromGitPath(line.slice(3).trim()))
  )].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const modifiedTop = [...new Set(statusLines
    .filter((line) => !line.startsWith('?? '))
    .map((line) => topNameFromGitPath(line.slice(3).trim()))
  )].sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

  const summaries = Object.fromEntries([...missingFromUmbrella, ...umbrellaOnly]
    .filter((item) => item.kind === 'dir')
    .map((item) => [item.name, walkSummary(item.path, item.name)]));

  const report = {
    generatedAt: new Date().toISOString(),
    root,
    repo,
    trackedFileCount: trackedFiles.length,
    gitStatusCount: statusLines.length,
    missingFromUmbrella,
    presentInUmbrella,
    umbrellaOnly,
    untrackedTop,
    modifiedTop,
    summaries,
  };

  const docsDir = path.join(repo, 'docs');
  fs.mkdirSync(docsDir, { recursive: true });
  const jsonPath = path.join(docsDir, 'UMBRELLA-COVERAGE-AUDIT.json');
  const mdPath = path.join(docsDir, 'UMBRELLA-COVERAGE-AUDIT.md');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2) + '\n', 'utf8');

  const missingRows = missingFromUmbrella.map((item) => ({
    ...item,
    summary: item.kind === 'dir' ? summaries[item.name] : { files: 1, dirs: 0, bytes: item.bytes, skipped: 0 },
  }));
  const untrackedRows = untrackedTop.map((name) => {
    const fullPath = path.join(repo, name);
    const stat = statSafe(fullPath);
    const summary = stat?.isDirectory() ? walkSummary(fullPath, name) : { files: stat ? 1 : 0, dirs: 0, bytes: stat?.size || 0, skipped: 0 };
    return { name, kind: stat?.isDirectory() ? 'dir' : 'file', summary };
  });

  const md = [
    '# Umbrella Coverage Audit',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    `Outer root: \`${root}\``,
    '',
    `Umbrella repo: \`${repo}\``,
    '',
    `Tracked files: ${trackedFiles.length}`,
    '',
    `Git status entries: ${statusLines.length}`,
    '',
    '## Missing From Umbrella Top Level',
    '',
    missingRows.length
      ? markdownTable(missingRows, [
          { label: 'Name', value: (row) => `\`${row.name}\`` },
          { label: 'Kind', value: (row) => row.kind },
          { label: 'Files', value: (row) => row.summary.files },
          { label: 'Dirs', value: (row) => row.summary.dirs },
          { label: 'Size', value: (row) => fmtBytes(row.summary.bytes) },
          { label: 'Skipped', value: (row) => row.summary.skipped },
        ])
      : 'None.',
    '',
    '## Untracked Top Level Inside Umbrella',
    '',
    untrackedRows.length
      ? markdownTable(untrackedRows, [
          { label: 'Name', value: (row) => `\`${row.name}\`` },
          { label: 'Kind', value: (row) => row.kind },
          { label: 'Files', value: (row) => row.summary.files },
          { label: 'Dirs', value: (row) => row.summary.dirs },
          { label: 'Size', value: (row) => fmtBytes(row.summary.bytes) },
          { label: 'Skipped', value: (row) => row.summary.skipped },
        ])
      : 'None.',
    '',
    '## Modified Tracked Top Level',
    '',
    modifiedTop.length ? modifiedTop.map((name) => `- \`${name}\``).join('\n') : 'None.',
    '',
    '## Rule',
    '',
    'The umbrella repo is not complete until required source/docs from the outer root are copied into this repo, generated/cache/archive folders are explicitly excluded, and `git status --short` contains no important untracked source folders.',
    '',
  ].join('\n');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`Wrote ${mdPath}`);
  console.log(`Wrote ${jsonPath}`);
}

main();
