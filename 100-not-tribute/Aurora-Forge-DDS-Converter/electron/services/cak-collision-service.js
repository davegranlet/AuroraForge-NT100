const fs = require('fs');
const path = require('path');
const { deriveArchiveKeyV99 } = require('../cak-v99-key');

const MAX_ARCHIVES = 32;
const MAX_FILES = 250000;
const MAX_COLLISIONS = 2000;

function lexicalCompare(left, right) { return left < right ? -1 : (left > right ? 1 : 0); }

function buildCollisionReport(sessions) {
  const ordered = [...sessions].sort((a, b) => lexicalCompare(a.archiveName, b.archiveName));
  const resolvedProviders = new Map();
  const hashProviders = new Map();
  let totalFiles = 0; let resolvedFiles = 0; let unresolvedFiles = 0;
  ordered.forEach((session, index) => {
    const seenResolved = new Set(); const seenHashes = new Set();
    for (const file of session.files || []) {
      totalFiles += 1;
      if (totalFiles > MAX_FILES) throw new Error('Collision scan exceeded the 250,000-file safety limit.');
      const provider = { archive: session.archiveName, priority: index + 1, hash: String(file.hash || '') };
      if (file.nameResolved && file.name) {
        const virtualPath = String(file.name).replace(/\\/g, '/');
        const key = virtualPath.toLowerCase();
        if (!seenResolved.has(key)) { if (!resolvedProviders.has(key)) resolvedProviders.set(key, { virtualPath, providers: [] }); resolvedProviders.get(key).providers.push(provider); seenResolved.add(key); }
        resolvedFiles += 1;
      } else {
        const hash = String(file.hash || '');
        if (hash && !seenHashes.has(hash)) { if (!hashProviders.has(hash)) hashProviders.set(hash, []); hashProviders.get(hash).push(provider); seenHashes.add(hash); }
        unresolvedFiles += 1;
      }
    }
  });
  const allCollisions = [...resolvedProviders.values()].filter((entry) => entry.providers.length > 1)
    .sort((a, b) => lexicalCompare(a.virtualPath.toLowerCase(), b.virtualPath.toLowerCase()));
  const collisions = allCollisions.slice(0, MAX_COLLISIONS).map((entry) => ({
    virtualPath: entry.virtualPath,
    providers: entry.providers,
    expectedWinner: entry.providers[entry.providers.length - 1].archive,
    winnerConfidence: 'Inference — confirm the visible result in-game.'
  }));
  const unresolvedHashCollisions = [...hashProviders.entries()].filter(([, providers]) => providers.length > 1).length;
  const textureCollision = allCollisions.find((entry) => entry.virtualPath.toLowerCase() === '_textures.tdb');
  const filenameKeyWarnings = ordered.filter((session) => Number.isInteger(session.key) && deriveArchiveKeyV99(session.archiveName) !== (session.key >>> 0)).map((session) => `${session.archiveName}: the catalog key does not match the current filename. The CAK may have been renamed after it was built.`);
  const warnings = [...filenameKeyWarnings];
  if (textureCollision) warnings.push(`_textures.tdb is supplied by ${textureCollision.providers.length} archives. The inferred last provider may hide texture metadata from earlier mods; this is not proof that their texture entries are safely merged.`);
  return {
    status: 'Experimental',
    orderRule: 'Observed Secure DataCtrlLink v1.0.0 behavior: case-sensitive alphabetical archive path sort. Later mount calls are shown last.',
    winnerRule: 'Inferred only: the last mounted provider is expected to win. The game mount routine’s conflict behavior is not yet proven.',
    archives: ordered.map((session, index) => ({ archive: session.archiveName, priority: index + 1, fileCount: (session.files || []).length, resolvedPaths: (session.files || []).filter((file) => file.nameResolved).length, filenameKey: Number.isInteger(session.key) ? (deriveArchiveKeyV99(session.archiveName) === (session.key >>> 0) ? 'Matches current filename' : 'Mismatch — possible rename') : 'Not checked' })),
    totals: { archives: ordered.length, files: totalFiles, resolvedFiles, unresolvedFiles, exactCollisions: allCollisions.length, unresolvedHashCollisions, collisionsReturned: collisions.length, collisionLimitReached: allCollisions.length > collisions.length },
    collisions,
    warnings
  };
}

function createCakCollisionService({ installRegistry, openArchive, readDictionary }) {
  function scan() {
    const install = installRegistry.getAll().wwe2k26;
    if (!install) return { found: false, reason: 'Choose the WWE 2K26 folder first.' };
    const modsRoot = path.join(install.root, 'mods');
    if (!fs.existsSync(modsRoot)) return { found: false, reason: 'The configured game has no mods folder.' };
    const rootStat = fs.lstatSync(modsRoot);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('The mods folder must be a regular local directory.');
    const archives = fs.readdirSync(modsRoot, { withFileTypes: true }).filter((entry) => entry.isFile() && !entry.isSymbolicLink() && entry.name.toLowerCase().endsWith('.cak')).map((entry) => ({ name: entry.name, filePath: path.join(modsRoot, entry.name) })).sort((a, b) => lexicalCompare(a.name, b.name));
    if (archives.length > MAX_ARCHIVES) throw new Error('Collision scan blocked: the mods folder exceeds the 32-archive loader limit.');
    if (!archives.length) return { found: true, report: buildCollisionReport([]), errors: [] };
    const dictionary = readDictionary(); const sessions = []; const errors = [];
    for (const archive of archives) {
      try {
        const stat = fs.lstatSync(archive.filePath);
        if (!stat.isFile() || stat.isSymbolicLink()) { errors.push({ archive: archive.name, error: 'Skipped because it is not a regular direct-child file.' }); continue; }
        sessions.push(openArchive(archive.filePath, dictionary));
      } catch (error) { errors.push({ archive: archive.name, error: String(error.message || error).slice(0, 500) }); }
    }
    return { found: true, report: buildCollisionReport(sessions), errors };
  }
  return { scan };
}

module.exports = { createCakCollisionService, buildCollisionReport, lexicalCompare, MAX_ARCHIVES, MAX_FILES, MAX_COLLISIONS };
