const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const appRoot = path.join(root, 'app');
let failures = 0;

function ok(condition, message) {
  if (condition) console.log('OK:', message);
  else {
    console.error('FAIL:', message);
    failures += 1;
  }
}
function read(...parts) {
  return fs.readFileSync(path.join(root, ...parts), 'utf8');
}
function exists(...parts) {
  return fs.existsSync(path.join(root, ...parts));
}
function json(...parts) {
  return JSON.parse(read(...parts));
}
function count(text, value) {
  return text.split(value).length - 1;
}

const pkg = json('package.json');
const lock = json('package-lock.json');
const manifest = json('app', 'app-manifest.json');
const config = json('app', 'config', 'app-config.json');
const mainJs = read('electron', 'main.js');
const preloadJs = read('electron', 'preload.js');
const guideDataJs = read('app', 'assets', 'js', 'easy-guide-data.js');
const knowledge = json('app', 'data', 'wwe2k26-modding-facts.json');
const knowledge22 = json('app', 'data', 'wwe2k22-modding-facts.json');
const projectCatalog = json('app', 'data', 'aurora-projects.json');

ok(pkg.version === '2.0.0', 'standards-safe package version is 2.0');
ok(lock.version === '2.0.0' && lock.packages[''].version === '2.0.0', 'package-lock root version matches');
ok(manifest.release === '2.0.h' && manifest.releaseTitle === 'Beta 3', 'manifest identifies visible AuroraForge NT100 Beta3');
ok(config.release === '2.0.h' && config.releaseTitle === 'Beta 3', 'app config identifies visible AuroraForge NT100 Beta3');
const releaseChallenge = json('app', 'config', 'release-challenge.json');
ok(releaseChallenge.release === '2.0.h' && releaseChallenge.releaseTitle === 'Beta 3' && /^[0-9a-f]{64}$/i.test(releaseChallenge.challenge || ''), 'per-release verification challenge is generated for Beta3');
ok(pkg.devDependencies.electron === '43.2.0', 'Electron is exactly pinned');
ok(pkg.devDependencies['@electron/packager'] === '20.0.4', 'Electron Packager is exactly pinned');
ok(pkg.dependencies.three === '0.185.1', 'Three.js is exactly pinned');
ok(!JSON.stringify(pkg).includes('"latest"'), 'no latest dependency ranges are used');
ok(!JSON.stringify(pkg).includes('electron-builder'), 'electron-builder is not used');

const required = [
  'app/index.html',
  'app/access-gate.html',
  'app/project-manager.html',
  'app/creative-studios.html',
  'app/tools.html',
  'app/aurora-projects.html',
  'app/data/aurora-projects.json',
  'app/assets/js/aurora-projects.js',
  'app/assets/js/access-gate.js',
  'app/tools/access-gate/patreon-access.js',
  'app/tools/animation-converter/Aurora-Forge-2.0.d-Preview.exe',
  'app/tools/animation-converter/SHA256SUMS.txt',
  'app/tools/wwe2k25-loader/dinput8.dll',
  'app/tools/wwe2k25-loader/plugins/AuroraForge.CAKModLoader.ftrib',
  'app/tools/wwe2k25-loader/SHA256SUMS.txt',
  'app/mod-suite.html',
  'app/faq.html',
  'app/tutorials.html',
  'app/complete-character-modding-guide.html',
  'app/data/wwe2k26-modding-facts.json',
  'app/data/wwe2k22-modding-facts.json',
  'app/handbook-reader.html',
  'app/setup.html',
  'app/about.html',
  'app/caw-character-builder.html',
  'app/lmask-project-studio.html',
  'app/face-texture-studio.html',
  'app/tattoo-pipeline.html',
  'app/character-viewer.html',
  'app/face-calibration-workflow.html',
  'app/mod-file-inspector.html',
  'app/dds-converter.html',
  'app/assets/js/dds-converter.js',
  'app/cak-explorer.html',
  'app/pac19-explorer.html',
  'app/assets/js/pac19-explorer.js',
  'app/cak20-explorer.html',
  'app/assets/js/cak20-explorer.js',
  'app/data/cak-known-paths.json',
  'app/assets/js/cak-explorer.js',
  'app/tools/cak-helper/AuroraCakHelper.exe',
  'app/tools/cak-helper/README.txt',
  'electron/cak-reader.js',
  'electron/cak20-reader.js',
  'electron/archive-repackager.js',
  'electron/cak-v99-key.js',
  'electron/standalone-cak-main.js',
  'electron/standalone-dds-main.js',
  'electron/standalone-pac19-main.js',
  'electron/standalone-cak20-main.js',
  'tools/AuroraCakHelper/AuroraCakHelper.csproj',
  'tools/AuroraCakHelper/Program.cs',
  'tools/AuroraPac19Helper/AuroraPac19Helper.csproj',
  'tools/AuroraPac19Helper/Program.cs',
  'tools/AuroraPac19Helper/THIRD-PARTY-NOTICES.md',
  'LICENSE',
  'app/tools/texconv/texconv.exe',
  'app/tools/texconv/LICENSE.txt',
  'app/tools/texconv/SOURCE.txt',
  'app/assets/js/easy-guide-data.js',
  'app/assets/js/easy-guide.js',
  'app/assets/js/handbook-reader.js',
  'app/assets/js/tool-center.js',
  'app/assets/js/mod-suite-data.js',
  'app/assets/js/mod-suite.js',
  'app/training/community-reference/tribute26-replace-slot-checkbox.png',
  'app/training/community-reference/tribute26-entrance-template-editor.png',
  'app/training/community-reference/tribute26-prop-profile-generator.mp4',
  'app/downloads/Aurora_Forge_Reader_Handbook.docx',
  'app/downloads/Aurora_Forge_Reader_Handbook.pdf',
  'electron/main.js',
  'electron/preload.js'
];
required.forEach((item) => ok(exists(item), item + ' exists'));

const allFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else allFiles.push(full);
  }
}
walk(appRoot);
ok(!allFiles.some((file) => file.toLowerCase().endsWith('.php')), 'no PHP files are present');
const bundledBuildAsset = (file) => /[\\/]skeletons[\\/]/i.test(file) || /[\\/]tools[\\/]cak-v93[\\/]/i.test(file);
ok(!allFiles.some((file) => /\.(dds|mcd|mtls|jmtl|ycl|cak)$/i.test(file) && !bundledBuildAsset(file)), 'no extracted game or proprietary character assets are bundled');

const expectedPrimary = [
  'index.html',
  'project-manager.html',
  'creative-studios.html',
  'tools.html',
  'tutorials.html',
  'setup.html',
  'about.html'
];
ok(manifest.primaryNavigation.length === 7, 'manifest contains seven primary navigation items');
ok(JSON.stringify(manifest.primaryNavigation.map((item) => item.file)) === JSON.stringify(expectedPrimary), 'manifest primary navigation order is correct');
ok(manifest.creativeStudios.length === 13, 'manifest groups thirteen creative studios');
ok(manifest.tools.length === 9, 'manifest groups nine built-in tools');
ok(projectCatalog.schema === 'aurora-forge-project-catalog-v1', 'project catalog schema is recognized');
ok(projectCatalog.release === 'Beta 3', 'project catalog identifies Beta3');
ok(projectCatalog.projects.length === 33, 'project catalog contains all 33 repositories');
ok(read('README.md').includes('owner-only build'), 'README keeps project catalog as an owner-only candidate');
const projectIds = projectCatalog.projects.map((project) => project.id);
ok(new Set(projectIds).size === projectIds.length, 'project catalog IDs are unique');
const projectStatuses = new Set(['ready', 'experimental', 'research', 'release', 'documentation', 'retired', 'reference']);
projectCatalog.projects.forEach((project) => {
  ok(Boolean(project.title && project.repository && project.workspaceRelativePath), `project ${project.id} has title, repository, and workspace path`);
  ok(projectStatuses.has(project.status), `project ${project.id} has a valid status`);
  if (project.integratedPage) ok(exists('app', project.integratedPage), `project ${project.id} integrated page exists`);
});
const animationProject = projectCatalog.projects.find((project) => project.id === 'animation-converter');
ok(animationProject?.status === 'experimental' && animationProject?.featured === true, '2K19 to 2K25 converter is featured with an honest experimental status');
const beta3ConverterHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(appRoot, 'tools', 'animation-converter', 'Aurora-Forge-2.0.d-Preview.exe'))).digest('hex').toUpperCase();
ok(beta3ConverterHash === '6E3729DDE74DCCD0C1C9D6CA31C9BDC810F30EAE6F82D1D8423EEDB80374E05F', 'bundled 2.0.d converter matches its recorded SHA-256');
const loaderCoreHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(appRoot, 'tools', 'wwe2k25-loader', 'dinput8.dll'))).digest('hex').toUpperCase();
const loaderAddonHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(appRoot, 'tools', 'wwe2k25-loader', 'plugins', 'AuroraForge.CAKModLoader.ftrib'))).digest('hex').toUpperCase();
ok(loaderCoreHash === 'E600D04F2E1A9AF3C23A358462E8B5C25064D6C08411819377E278581EF0ED2F', 'bundled WWE2K25 loader core matches verified SHA-256');
ok(loaderAddonHash === '8DF85F88EF117CAE07D9BA3788AB255C5986E3E460F905EDAB7C5972918E3E33', 'bundled WWE2K25 loader addon matches verified SHA-256');
ok(mainJs.includes("desktop:open-animation-converter") && mainJs.includes('bundledToolAccessEnv') && preloadJs.includes('openAnimationConverter'), 'umbrella exposes a scoped bundled-converter launcher with main-app access handoff');
ok(mainJs.includes("desktop:verify-access") && preloadJs.includes('verifyAccess'), 'umbrella owns the access verifier session');
ok(mainJs.includes("access-gate.html") && mainJs.includes("hasVerifiedAccess"), 'umbrella routes unverified users to the access gate');
ok(read('app', 'tools', 'access-gate', 'patreon-access.js').includes('aurora-patreon-verifier.rd741904.chatgpt.site'), 'main app access gate uses the established verifier host');

const entryStudioHtml = read('app', 'entry-studio.html');
const entryStudioPageJs = read('app', 'assets', 'js', 'entry-studio-page.js');
ok(entryStudioHtml.includes('entry-studio-page.js') && entryStudioPageJs.includes('entryStudio'), 'Entry Studio page runs in-app through the preload bridge');
ok(mainJs.includes('desktop:entry-studio-bake') && mainJs.includes('desktop:entry-studio-stage') && preloadJs.includes('entryStudio:'), 'Electron exposes the Entry Studio service without a local server');
ok(!/127\.0\.0\.1:7878/.test(mainJs + preloadJs + entryStudioHtml + read('app', 'tools.html')), 'Entry Studio no longer references the legacy local server');
ok(!read('app', 'tools.html').includes('openEntryStudio'), 'tools hub links Entry Studio to its in-app page');
ok(read('scripts', 'prepare-runtime-staging.js').includes('entry-studio'), 'runtime staging copies the Entry Studio toolchain');

const audioStudioHtml = read('app', 'audio-studio.html');
const audioStudioPageJs = read('app', 'assets', 'js', 'audio-studio-page.js');
ok(audioStudioHtml.includes('audio-studio-page.js') && audioStudioPageJs.includes('audioStudio'), 'Audio Studio page runs in-app through the preload bridge');
ok(mainJs.includes('desktop:audio-studio-build') && preloadJs.includes('audioStudio:'), 'Electron exposes the Audio Studio service');
ok(read('app', 'tools.html').includes('audio-studio.html'), 'tools hub links Audio Studio');
ok(fs.existsSync(path.join(appRoot, 'data', 'audio', 'MusicList.jsfb')) && read('electron', 'services', 'audio-studio-service.js').includes('data'), 'Audio Studio bundles its required MusicList.jsfb base');
ok(read('electron', 'services', 'audio-studio-service.js').includes("CustomMusic.cak") && read('electron', 'services', 'audio-studio-service.js').includes('ensureWorkingCopyFromExistingCak'), 'Audio Studio bakes a fixed CustomMusic.cak and accumulates edits from it');
ok(fs.existsSync(path.join(root, '..', 'animation', 'tools', 'build-wem.js')) && fs.existsSync(path.join(root, '..', 'animation', 'tools', 'build-music-pck.js')) && fs.existsSync(path.join(root, '..', 'animation', 'tools', 'edit-2k25-music-list.js')), 'audio pipeline tools exist (WEM muxer, AKPK builder, MusicList writer)');

const compatibilityPages = new Set(['access-gate.html', 'desktop-dashboard.html', 'tool-center.html', 'knowledgebase.html']);
const normalHtmlFiles = fs.readdirSync(appRoot).filter((name) =>
  name.endsWith('.html') && !compatibilityPages.has(name)
);
const studioFiles = new Set(manifest.creativeStudios.map((item) => item.file).concat([
  'creative-studios.html', 'lmask-idea-library.html', 'lmask-mapping-handoff.html', 'luchador-mask-generator.html'
]));
const toolFiles = new Set(manifest.tools.map((item) => item.file).concat(['tools.html']));
const modSuiteFiles = new Set(['mod-suite.html', 'mod-workshop.html', 'mod-file-inspector.html']);

normalHtmlFiles.forEach((file) => {
  const html = fs.readFileSync(path.join(appRoot, file), 'utf8');
  const navMatch = html.match(/<nav class="app-side-nav" aria-label="Primary app navigation">([\s\S]*?)<\/nav>/);
  ok(Boolean(navMatch), file + ' has primary navigation');
  if (!navMatch) return;
  const nav = navMatch[1];
  expectedPrimary.forEach((href) => ok(count(nav, `href="${href}"`) === 1, `${file} contains one ${href} navigation link`));
  ok(count(nav, 'app-nav-link active') === 1, file + ' has one active main section');
  ok(!/Workspace|External Tools|More studios|Easy Guide<\/strong>|Creator Suite<\/strong>/i.test(nav), file + ' navigation contains no old top-level labels');
  ok(!/desktop-dashboard\.html|tool-center\.html|knowledgebase\.html/i.test(nav), file + ' navigation contains no replaced destinations');

  if (studioFiles.has(file)) ok(nav.includes('class="app-nav-link active" href="creative-studios.html"'), file + ' highlights Creative Studios');
  if (modSuiteFiles.has(file)) ok(nav.includes('class="app-nav-link active" href="mod-suite.html"'), file + ' highlights Package & Test');
  else if (toolFiles.has(file)) ok(nav.includes('class="app-nav-link active" href="tools.html"'), file + ' highlights Tools');
});

const projectsHtml = read('app', 'project-manager.html');
ok(projectsHtml.includes('Project folders') && projectsHtml.includes('id="pmOpenExportsFolder"'), 'Projects contains former Workspace folder actions');
ok(projectsHtml.includes('Change Folder Locations') && projectsHtml.includes('setup.html#storage'), 'Projects routes location changes to Setup');
ok(!projectsHtml.includes('onclick='), 'Projects uses CSP-safe button handlers');
ok(read('app', 'assets', 'js', 'project-manager.js').includes('pmCreateFolder') && read('app', 'assets', 'js', 'project-manager.js').includes('pmSaveSummary'), 'Projects button handlers are registered');
ok(read('app', 'desktop-dashboard.html').includes('url=project-manager.html'), 'old Workspace link redirects to Projects');

const setupHtml = read('app', 'setup.html');
['storage', 'game-locations', 'external-programs', 'preferences', 'setup-check'].forEach((id) => {
  ok(setupHtml.includes(`id="${id}"`), 'Setup contains ' + id + ' section');
});
ok(setupHtml.includes('storageLocationGrid') && setupHtml.includes('externalToolGrid'), 'Setup contains storage and external-program controls');
ok(setupHtml.includes('setupCheckAuroraLoader') && setupHtml.includes('auroraLoaderReport'), 'Setup exposes the Aurora loader check');
ok(!/CakeHook|CakeView|Tribute Tutorial|setupCheckCakeHook|cakeHookReport/.test(setupHtml), 'Setup no longer exposes old third-party setup flows');
ok(!setupHtml.includes('onclick='), 'Setup uses CSP-safe button handlers');
ok(read('app', 'assets', 'js', 'setup.js').includes('setupCheckEverything') && read('app', 'assets', 'js', 'setup.js').includes('setupSavePreferences'), 'Setup button handlers are registered');
ok(read('app', 'tool-center.html').includes('url=setup.html#external-programs'), 'old External Tools link redirects to Setup');
ok(mainJs.includes('projectsFolder') && mainJs.includes('exportsFolder'), 'Electron supports persistent Projects and Exports locations');
ok(mainJs.includes("desktop:check-aurora-loader") && preloadJs.includes('checkAuroraLoader'), 'Electron exposes Aurora loader setup check');
ok(!/desktop:check-cakehook|cakeView:|tribute:/.test(mainJs + preloadJs), 'Electron setup allowlist excludes old third-party tool gates');
ok(!/cakeView|tribute|texconv/.test(read('app', 'assets', 'js', 'tool-center.js')), 'Setup renderer only lists supported creative programs');
ok(mainJs.includes('AuroraForge NT100 Beta 3') && mainJs.includes('Internal build 2.0.h'), 'Electron About uses visible Beta3 release identity');
ok(!mainJs.includes('toggleDevTools'), 'normal Electron menu does not expose developer tools');

const studiosHtml = read('app', 'creative-studios.html');
manifest.creativeStudios.forEach((studio) => {
  ok(studiosHtml.includes(`href="${studio.file}"`), 'Creative Studios links ' + studio.title);
});
['character-studios', 'clothing-studios', 'graphics-studios', 'show-studios'].forEach((id) => {
  ok(studiosHtml.includes(`id="${id}"`), 'Creative Studios contains ' + id + ' group');
});

const toolsHtml = read('app', 'tools.html');
manifest.tools.forEach((tool) => ok(toolsHtml.includes(`href="${tool.file}"`), 'Tools links ' + tool.title));
ok(!toolsHtml.includes('tool-center.html'), 'Tools does not treat external programs as built-in tools');
['app/index.html', 'app/tools.html', 'app/about.html'].forEach((file) => {
  const html = read(file);
  ok(!/Project Catalog|33 repositor/i.test(html), file + ' does not expose the internal repository catalog');
  ok(!html.includes('href="aurora-projects.html"'), file + ' does not link to the internal repository catalog');
});
ok(!read('app', 'aurora-projects.html').includes('id="projectCatalog"'), 'legacy project-catalog URL no longer renders the repository grid');
const ddsHtml = read('app', 'dds-converter.html');
const ddsJs = read('app', 'assets', 'js', 'dds-converter.js');
['ddsChooseInputs', 'ddsChooseOutput', 'ddsRunConversion', 'ddsConversionResults'].forEach((id) => ok(ddsHtml.includes(`id="${id}"`), 'DDS Converter contains ' + id));
['getDdsConverterStatus', 'chooseDdsConverterInputs', 'chooseDdsConverterFolder', 'runDdsConversion', 'openDdsConverterOutput'].forEach((method) => ok(preloadJs.includes(method), 'preload exposes scoped DDS method ' + method));
['desktop:dds-converter-status', 'desktop:dds-converter-run', 'inspectDdsFile', 'inspectPngFile', 'Included Microsoft DirectXTex converter'].forEach((token) => ok(mainJs.includes(token), 'Electron DDS backend contains ' + token));
['Choose a separate output folder.', 'duplicate names from different folders', 'separate from the original DDS reference folder'].forEach((token) => ok(mainJs.includes(token), 'DDS safety guard contains: ' + token));
ok(!/require\(['"](?:fs|child_process)['"]\)|electronAPI|ipcRenderer/.test(ddsJs), 'DDS renderer has no direct filesystem, process, or IPC access');
const texconvHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(appRoot, 'tools', 'texconv', 'texconv.exe'))).digest('hex').toUpperCase();
ok(texconvHash === 'DCFDEC10244E02CF5037FBA089C55FB7E1326B1C8181742D77D15FA5CB5EEF06', 'bundled official texconv binary matches recorded SHA-256');
ok(read('app', 'tools', 'texconv', 'SOURCE.txt').includes('may2026') && read('app', 'tools', 'texconv', 'LICENSE.txt').includes('MIT License'), 'DirectXTex source and MIT license are included');

const cakHtml = read('app', 'cak-explorer.html');
const cakJs = read('app', 'assets', 'js', 'cak-explorer.js');
const cakReaderJs = read('electron', 'cak-reader.js');
const cakNames = json('app', 'data', 'cak-known-paths.json');
['cakArchiveSelect', 'cakResults', 'cakChooseOutput', 'cakExtract', 'cakDevDetails'].forEach((id) => ok(cakHtml.includes(`id="${id}"`), 'Aurora CAK Foundry contains ' + id));
['getCakExplorerStatus', 'chooseCakArchive', 'openCakArchive', 'searchCakArchive', 'extractCakEntries'].forEach((method) => ok(preloadJs.includes(method), 'preload exposes scoped CAK method ' + method));
['desktop:cak-explorer-open', 'desktop:cak-explorer-search', 'desktop:cak-explorer-extract', 'Extraction into the game folder is blocked'].forEach((token) => ok(mainJs.includes(token), 'Electron CAK backend contains ' + token));
['decodePairs', 'recoverKey', 'parseFiles', 'parseFolders', 'buildNameCandidates'].forEach((token) => ok(cakReaderJs.includes(token), 'CAK reader contains ' + token));
ok(!/require\(['"](?:fs|child_process)['"]\)|ipcRenderer/.test(cakJs), 'CAK renderer has no direct filesystem, process, or IPC access');
ok(guideDataJs.includes("id: 'cak-explorer'"), 'Tutorials include child-friendly CAK extraction lesson');
ok(fs.statSync(path.join(appRoot, 'tools', 'cak-helper', 'AuroraCakHelper.exe')).size > 1000000, 'self-contained x64 extraction helper is included');
ok(pkg.scripts['pack:win'].includes('--asar.unpackDir=app/tools'), 'portable build unpacks executable tools from app.asar');
ok(mainJs.includes("process.resourcesPath, 'app.asar.unpacked', 'app', 'tools'"), 'packaged runtime resolves executable tools from app.asar.unpacked');
ok(Object.keys(cakNames).length === 393413, 'bundled CAK catalog contains exactly 393,413 confirmed registry paths');
const normalizedCakNames = Object.values(cakNames).map((name) => name.toLowerCase());
ok(normalizedCakNames.includes('characters/996_roxanne_perez/996_default_attire/996_attire.mtls'), 'catalog retains a verified WWE 2K26 character material-list path');
ok(normalizedCakNames.some((name) => name.startsWith('cas/')) && normalizedCakNames.some((name) => name.startsWith('arena/')), 'catalog includes newly resolved CAS and arena path families');
ok(cakReaderJs.includes('variantsFor') && cakReaderJs.includes("/^root\\//i"), 'developer catalog builder safely handles extraction trees wrapped in a Root folder');
ok(cakHtml.includes('value="resolved"') && cakHtml.includes('Raw hashes / external references'), 'archive page separates ready files from raw hashes and external references');
ok(cakReaderJs.includes("options.scope) ? options.scope : 'resolved'"), 'archive searches default to real-path files only');
ok(cakReaderJs.includes("file.availability = file.extractable ? (file.nameResolved ? 'ready' : 'raw-hash') : 'external-reference'"), 'archive reader distinguishes ready files, raw-hash payloads, and external references');
ok(cakReaderJs.includes('Unresolved/${path.basename') && cakReaderJs.includes('safeGeneratedName(file)'), 'unnamed payloads receive safe archive-scoped generated paths');
ok(!mainJs.includes('findExistingExtractRoots'), 'archive opening never auto-scans a large extracted-files tree');
ok(mainJs.includes('cakReader.openArchive(selected, readCakDictionary())'), 'archive opening uses the bundled dictionary immediately');
ok(!mainJs.includes('cakDictionaryPath') && !mainJs.includes('writeCakDictionary'), 'runtime catalog cannot be overridden by stale local name data');
ok(!mainJs.includes('desktop:cak-explorer-build-dictionary'), 'Electron exposes no end-user extraction-tree scanner');
ok(!preloadJs.includes('buildCakNameDictionary') && !cakJs.includes('cakBuildNames') && !cakHtml.includes('cakBuildNames'), 'archive interface exposes no end-user name-learning workflow');
ok(!setupHtml.includes('crossGenerationGrid') && !read('app', 'assets', 'js', 'tool-center.js').includes('extracts26'), 'Setup does not ask users for extracted game folders');
ok(cakHtml.includes('external reference cannot be extracted'), 'archive page explains why zero-payload external references cannot be extracted');
ok(cakHtml.includes('id="cakDevDetails" hidden'), 'normal archive page keeps technical session details out of view');
ok(cakJs.includes('box.disabled = item.extractable === false') && cakJs.includes('(raw hash name)'), 'archive interface permits raw-hash payloads and disables only zero-payload references');

const faqHtml = read('app', 'faq.html');
ok(faqHtml.includes('Is AuroraForge NT100 an AI chatbot?') && faqHtml.includes('Does AuroraForge NT100 generate the finished artwork?'), 'FAQ explains the prompt-generator boundary');
ok(faqHtml.includes('does not send prompts automatically') && faqHtml.includes('user controls if, when, and where'), 'FAQ explains provider choice and local control');

const tutorialsHtml = read('app', 'tutorials.html');
ok(tutorialsHtml.includes('Rebuilding the tutorial section') && tutorialsHtml.includes('tutorial-rebuild-hero'), 'Tutorials is replaced by the Beta2 rebuilding screen');
ok(tutorialsHtml.includes('Only Aurora-supported paths belong here'), 'Tutorials states the Aurora-supported guide boundary');
ok(!tutorialsHtml.includes('easy-guide-list') && !tutorialsHtml.includes('easy-guide-search'), 'Tutorials no longer exposes the old Easy Guide library');
ok(count(tutorialsHtml, 'tutorial-video-choice') === 0, 'Tutorials no longer exposes old animated video choices');
ok(!tutorialsHtml.includes('complete-character-modding-guide.html') && !tutorialsHtml.includes('handbook-reader.html'), 'Tutorials no longer links the stale character guide or handbook');
ok(read('app', 'knowledgebase.html').includes('url=tutorials.html'), 'old knowledgebase link redirects to Tutorials');

const aboutHtml = read('app', 'about.html');
ok(aboutHtml.includes('v2.0'), 'About displays visible version 2.0');
ok(aboutHtml.includes('Microsoft DirectXTex') && aboutHtml.includes('MIT License'), 'About credits the bundled open-source converter');
ok(aboutHtml.includes('compiled-only') && aboutHtml.includes('source is cleared'), 'About explains compiled-only source availability boundary');
ok(faqHtml.includes('Not yet') && faqHtml.includes('compiled-only') && faqHtml.includes('source is cleared'), 'FAQ explains source will be posted when cleared');
ok(!normalHtmlFiles.some((file) => /internal production notes/i.test(read('app', file))), 'public app contains no internal production notes');
ok(cakHtml.includes('id="repackBuild"') && cakHtml.includes('Build Game-Ready CAK') && preloadJs.includes('verifyRepackPackage') && mainJs.includes('archiveRepackager.buildCak'), 'Aurora CAK Foundry includes the CAK baker and verification controls');
const modSuiteHtml = read('app', 'mod-suite.html');
const modSuiteDataJs = read('app', 'assets', 'js', 'mod-suite-data.js');
const modSuiteJs = read('app', 'assets', 'js', 'mod-suite.js');
ok(modSuiteHtml.includes('Ready to Use') && modSuiteHtml.includes('Coming Soon'), 'WWE 2K26 Modding Hub explains working and upcoming tool status');
ok((modSuiteDataJs.match(/status: 'active'/g) || []).length >= 8 && (modSuiteDataJs.match(/status: 'coming-soon'/g) || []).length >= 25, 'Modding Hub maps working tools and the Beta2 replacement roadmap');
ok(!/status: 'active'[^\n]+(?:profile:|tutorials\.html)/.test(modSuiteDataJs), 'Ready to Use entries are real operations, not plans or tutorial links');
ok(modSuiteJs.includes('createModSuiteWorkspace') && modSuiteJs.includes('chooseAndAuditModFolder'), 'Mod Suite connects workspace creation and read-only auditing');
ok(preloadJs.includes('createModSuiteWorkspace') && mainJs.includes("desktop:mod-suite-create-workspace") && mainJs.includes("desktop:mod-suite-choose-audit-folder"), 'desktop bridge exposes Mod Suite operations');
ok(cakHtml.includes('id="cakBrowseAll"') && cakHtml.includes('Open All Game CAKs') && cakJs.includes("openArchive('all-archives')") && preloadJs.includes('openAllCakArchives') && mainJs.includes("desktop:cak-explorer-open-all"), 'Aurora CAK Foundry opens every CAK in the configured game folder as one browser');

ok(mainJs.includes('contextIsolation: true') && mainJs.includes('sandbox: true') && mainJs.includes('nodeIntegration: false'), 'Electron renderer security settings are enabled');
ok(!preloadJs.includes('require(\'fs\')') && !preloadJs.includes('require("fs")'), 'preload exposes no direct filesystem module');
ok(mainJs.includes('assertKnownToolId') && mainJs.includes('TOOL_DEFINITIONS'), 'external-program choices use an allowlist');
ok(!mainJs.includes('downloadURL') && !mainJs.includes('autoUpdater'), 'Setup does not download or silently update third-party programs');

const htmlFiles = fs.readdirSync(appRoot).filter((name) => name.endsWith('.html'));
for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(appRoot, file), 'utf8');
  const refs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const ref of refs) {
    if (/^(?:https?:|mailto:|data:|blob:|#)/i.test(ref)) continue;
    const clean = ref.split('#')[0].split('?')[0];
    if (!clean) continue;
    ok(fs.existsSync(path.resolve(appRoot, clean)), `${file} reference exists: ${clean}`);
  }
}

const syntaxFiles = [
  'electron/main.js',
  'electron/preload.js',
  'electron/cak-reader.js',
  'electron/cak20-reader.js',
  'app/assets/js/project-manager.js',
  'app/assets/js/setup.js',
  'app/assets/js/tool-center.js',
  'app/assets/js/easy-guide.js',
  'app/assets/js/handbook-reader.js',
  'app/assets/js/caw-builder.js',
  'app/assets/js/active-studio-workflow.js',
  'app/assets/js/character-viewer.js',
  'app/assets/js/dds-converter.js',
  'app/assets/js/cak-explorer.js',
  'scripts/build-true-portable-windows.js',
  'scripts/prepare-runtime-staging.js',
  'scripts/verify-final-portable.js',
  'scripts/verify-dds-converter.js'
  ,'scripts/verify-cak-extraction.js'
  ,'scripts/verify-repackager.js'
  ,'scripts/build-standalone-windows.js'
  ,'scripts/build-cross-generation-path-catalog.js'
  ,'scripts/audit-extracted-layouts.js'
  ,'scripts/analyze-2k22-format.js'
];
syntaxFiles.forEach((file) => {
  const result = cp.spawnSync(process.execPath, ['--check', path.join(root, file)], { encoding: 'utf8' });
  ok(result.status === 0, file + ' passes JavaScript syntax check');
  if (result.status !== 0) console.error(result.stderr);
});

if (failures) {
  console.error(`\nAuroraForge NT100 verification failed with ${failures} problem(s).`);
  process.exit(1);
}
console.log('\nAuroraForge NT100 v2.0 source verification passed.');
