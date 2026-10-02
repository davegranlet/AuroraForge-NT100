const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createOperationJournal(userDataPath) {
  const journalRoot = path.join(userDataPath, 'operation-journal');
  const rollbackRoot = path.join(userDataPath, 'rollback');

  function record(entry) {
    const timestamp = entry.timestamp || new Date().toISOString();
    const id = timestamp.replace(/[:.]/g, '-') + '-' + crypto.randomBytes(4).toString('hex');
    const value = { id, ...entry, timestamp };
    fs.mkdirSync(journalRoot, { recursive: true });
    fs.writeFileSync(path.join(journalRoot, id + '.json'), JSON.stringify(value, null, 2) + '\n', 'utf8');
    return value;
  }

  function list(limit = 50) {
    if (!fs.existsSync(journalRoot)) return [];
    return fs.readdirSync(journalRoot).filter((name) => name.endsWith('.json')).sort().reverse().slice(0, Math.min(Math.max(limit, 1), 100))
      .map((name) => { try { return JSON.parse(fs.readFileSync(path.join(journalRoot, name), 'utf8')); } catch (_error) { return null; } })
      .filter(Boolean);
  }

  function redactedReport(capabilities) {
    const redactPath = (value) => value ? `<local>/${path.basename(value)}` : value;
    const cleanCapabilities = JSON.parse(JSON.stringify(capabilities || {}));
    if (cleanCapabilities.game && cleanCapabilities.game.root) cleanCapabilities.game.root = redactPath(cleanCapabilities.game.root);
    const operations = list(20).map((entry) => ({
      operation: entry.operation, timestamp: entry.timestamp, sourceSha256: entry.sourceSha256,
      installedSha256: entry.installedSha256, previousSha256: entry.previousSha256,
      target: redactPath(entry.target), backup: redactPath(entry.backup), result: entry.result
    }));
    return JSON.stringify({ schema: 'aurora-forge-redacted-diagnostic-v1', capabilities: cleanCapabilities, operations }, null, 2);
  }

  return { journalRoot, rollbackRoot, record, list, redactedReport };
}

module.exports = { createOperationJournal };
