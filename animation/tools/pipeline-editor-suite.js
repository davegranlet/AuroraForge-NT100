'use strict';
// Capability manifest for the 2K19 -> 2K25 pipeline editor surface.
// status is user-facing availability:
//   active = usable repo-owned read/write/inspect tooling exists right now.
//   coming = known section/item still needs implementation or validation work.
// mode describes the strongest current capability: write, read, or inspect.

const EDITOR_SECTIONS = [
  {
    section: 'Source Intake',
    artifacts: [
      {
        item: '2K19 archive entries',
        extensions: ['.pac', '.shdc'],
        status: 'active',
        mode: 'read',
        tools: ['tools/inspect_2k19_archive.js', 'tools/extract_2k19_archive_entries.js', 'tools/inspect_2k19_shdc.py'],
      },
      {
        item: '2K19 decoded menu/motion payloads',
        extensions: ['.bin'],
        status: 'active',
        mode: 'read',
        tools: ['tools/decode_2k19_menu_payloads.js', 'tools/yanm-keyframes.js'],
      },
    ],
  },
  {
    section: 'Modern Motion Payloads',
    artifacts: [
      {
        item: '2K25 clips container',
        extensions: ['.clips'],
        status: 'active',
        mode: 'write',
        tools: ['tools/clips-codec/build-imported-clips.js', 'tools/clips-layout.js', 'tools/clips-tool.js'],
        gap: 'Controlled overwrite/replace export path exists. New animation entries appearing in-game and final motion alignment remain in progress.',
      },
      {
        item: '2K25 animation definitions',
        extensions: ['.adefs'],
        status: 'active',
        mode: 'read',
        tools: ['tools/adefs-tool.js', 'tools/adefs-container.js', 'tools/adefs-json-export.js', 'tools/adefs-file.js', 'tools/adefs-payload.js'],
        gap: 'Sequential version-1 definitions support typed inspection/export and identity renaming with the Aurora helper. Unknown graph variants fail closed; event authoring and complete new-entry runtime binding remain unproven.',
      },
    ],
  },
  {
    section: '2K25 Registries',
    artifacts: [
      {
        item: 'VictoryListData',
        extensions: ['.jsfb'],
        status: 'active',
        mode: 'write',
        tools: ['tools/parse_2k25_victory_list.js', 'tools/append_2k25_victory_entry.js'],
        gap: 'Writers exist for controlled registry edits, but new entries appearing correctly in-game are not proven as of this build.',
      },
      {
        item: 'EntranceListData',
        extensions: ['.jsfb'],
        status: 'active',
        mode: 'write',
        tools: ['tools/locate-entrance-vectors.js', 'tools/find-2k25-entrance-entry.js', 'tools/diff-2k25-entrance-entries.js', 'tools/append_2k25_entrance_entry.js'],
        gap: 'Registration writers are under validation; new entries are not release-complete until they appear/select in game.',
      },
      {
        item: 'CutsceneNoRegistry',
        extensions: ['.jsfb'],
        status: 'active',
        mode: 'write',
        tools: ['tools/clips-codec/locate-cutscene-vector.js', 'tools/clips-codec/find-cutscene-entry.js', 'tools/clips-codec/inspect-cutscene-registry.js', 'tools/clips-codec/append-cutscene-entry.js'],
      },
      {
        item: 'String database',
        extensions: ['.sdb'],
        status: 'active',
        mode: 'write',
        tools: ['tools/sdb-read.js', 'tools/append_2k25_sdb_string.js'],
      },
      {
        item: 'Extended registration tables',
        extensions: ['.jsfb'],
        status: 'active',
        mode: 'write',
        tools: [
          'tools/jsfb-append-lib.js',
          'tools/append-2k25-teams-entry.js',
          'tools/append-2k25-character-mapping-entry.js',
          'tools/append-2k25-cammove-entry.js',
          'tools/append-2k25-face-textures-entry.js',
          'tools/append-2k25-charmoveset-slot.js',
          'tools/append-2k25-charprofilepro-entry.js',
          'tools/append-2k25-charprofiletable-entry.js',
        ],
        gap: 'Clean-room appenders mint well-formed rows offline with full old-row preservation proofs; in-game picker visibility still requires the loader-timing path and a playtest verdict.',
      },
    ],
  },
  {
    section: 'BakeMe Package Assembly',
    artifacts: [
      {
        item: 'BakeMe tree',
        extensions: ['directory'],
        status: 'active',
        mode: 'write',
        tools: ['tools/bakeme-orchestrator.js', 'tools/audit-extracted-root.js', 'tools/package-exported-clips.js'],
        gap: 'Orchestrates and proves copied BakeMe tree edits; CAK bake/reopen remains handled by Foundry/FTribTool.',
      },
      {
        item: 'CAK archive',
        extensions: ['.cak'],
        status: 'active',
        mode: 'inspect',
        tools: ['Aurora Forge CAK Foundry / FTribTool integration', 'tools/cak-catalog-summary.js'],
        gap: 'Baking is available through the Foundry integration; the next coming item is a wrapper that asserts source tree, reopen, and payload round trip for every generated aggregate.',
      },
    ],
  },
  {
    section: 'Game Serving',
    artifacts: [
      {
        item: 'DataCtrlLink log checker',
        extensions: ['.log'],
        status: 'active',
        mode: 'inspect',
        tools: ['tools/check-datactrlink-log.js'],
        gap: 'Grades the latest launch evidence; does not replace the required in-game picker/preview verdict.',
      },
      {
        item: 'DataCtrlLink loader timing',
        extensions: ['.dll', '.ftrib', '.log'],
        status: 'active',
        mode: 'inspect',
        tools: ['Secure-DataCtrlLink-WWE2K25', 'Aurora-Forge-CAK-Mod-Loader-WWE2K25'],
        gap: 'Boot-thread mount injection is verified on WWE 2K25 v1.23 and SNME. The next gate is generated TEST 14000 picker and preview evidence, not loader timing.',
      },
      {
        item: 'In-game mod-status overlay',
        extensions: ['.dll', '.ftrib'],
        status: 'coming',
        mode: 'inspect',
        tools: ['Aurora-Forge-CAK-Mod-Loader-WWE2K25 DXGI Present hook'],
        gap: 'DXGI Present hook has been built and installed; rendered in-frame notice remains unverified in a live WWE 2K25 launch.',
      },
    ],
  },
];

function listPipelineEditorSections() {
  return EDITOR_SECTIONS.map((section) => ({
    ...section,
    artifacts: section.artifacts.map((artifact) => ({ ...artifact, tools: [...artifact.tools], extensions: [...artifact.extensions] })),
  }));
}

function findPipelineEditors(status = null) {
  return listPipelineEditorSections().flatMap((section) => section.artifacts
    .filter((artifact) => status === null || artifact.status === status)
    .map((artifact) => ({ section: section.section, ...artifact })));
}

module.exports = { EDITOR_SECTIONS, listPipelineEditorSections, findPipelineEditors };

if (require.main === module) {
  const statusArg = process.argv.indexOf('--status');
  const status = statusArg >= 0 ? process.argv[statusArg + 1] : null;
  console.log(JSON.stringify(status ? findPipelineEditors(status) : listPipelineEditorSections(), null, 2));
}
