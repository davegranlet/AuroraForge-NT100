'use strict';

// Animation Editor's definition exports contain 64-bit identifiers as JSON
// numbers.  This module reads them only; it intentionally never reserializes
// an export, because JavaScript Number would lose precision for those IDs.
const fs = require('node:fs');
const path = require('node:path');

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const DEFINITION_NAME_KEY = '3746237326';
const CLIP_NAME_KEYS = ['3196319741', '2654933132'];

function inspectText(text, source = '<memory>') {
  if (typeof text !== 'string' || text.length === 0 || text.length > MAX_FILE_BYTES) throw new Error(`${source}: JSON is outside safe size bounds`);
  let value;
  try { value = JSON.parse(text); } catch (error) { throw new Error(`${source}: invalid JSON (${error.message})`); }
  if (!value || value['editor format'] !== 'DEF_FULL' || !Array.isArray(value.states) || !value.states.length) throw new Error(`${source}: not an Animation Editor full definition export`);
  const definitions = value.states.map((state, index) => {
    const name = state?.kv?.[DEFINITION_NAME_KEY];
    const node = state?.node?.kv;
    if (typeof name !== 'string' || !name) throw new Error(`${source}: state ${index} has no definition name`);
    if (!node || typeof node !== 'object') throw new Error(`${source}: state ${index} has no node fields`);
    const clips = [...new Set(CLIP_NAME_KEYS.map(key => node[key]).filter(value => typeof value === 'string' && value.length))];
    return { name, clips, eventCount: Array.isArray(state.events) ? state.events.length : 0 };
  });
  return { source, version: value.version, definitions };
}

function inspectDirectory(directory) {
  const root = path.resolve(directory); const stat = fs.statSync(root);
  if (!stat.isDirectory()) throw new Error('export path is not a directory');
  const files = fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.json')).map(entry => entry.name).sort();
  if (!files.length) throw new Error('export directory contains no JSON files');
  const inspected = files.map(name => inspectText(fs.readFileSync(path.join(root, name), 'utf8'), name));
  const definitions = inspected.flatMap(item => item.definitions);
  const names = definitions.map(item => item.name);
  if (new Set(names).size !== names.length) throw new Error('export directory contains duplicate definition names');
  return { schema: 'aurora-forge-adefs-export-audit/v1', directory: root, files: files.length, definitions, clipReferences: [...new Set(definitions.flatMap(item => item.clips))].sort() };
}

if (require.main === module) {
  try { if (!process.argv[2]) throw new Error('Usage: node tools/adefs-json-export.js <export-directory>'); console.log(JSON.stringify(inspectDirectory(process.argv[2]), null, 2)); }
  catch (error) { console.error(`ADefs export audit failed: ${error.message}`); process.exitCode = 1; }
}

module.exports = { inspectText, inspectDirectory };
