'use strict';

const fs = require('node:fs');
const crypto = require('node:crypto');

function fnv1a64(text) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of Buffer.from(text, 'utf8')) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString();
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
}

function buildIdentityMap(scan, kind, catalogLines = []) {
  const result = new Map();
  const labelSets = new Map();
  for (const match of scan.matches || []) {
    if ((kind === 'event' ? match.target?.eventCount : match.target?.argumentCount) <= 0) continue;
    if (match.normalization !== 'exact' || fnv1a64(match.text) !== String(match.guid)) continue;
    const labels = labelSets.get(match.guid) || new Set();
    labels.add(match.text);
    labelSets.set(match.guid, labels);
  }
  for (const line of catalogLines) {
    const text = String(line).trim();
    const catalogLabels = kind === 'event'
      ? (/^[A-Za-z_][A-Za-z0-9_]*$/.test(text) ? [text] : [])
      : text.split(/[^A-Za-z0-9_]+/).filter(Boolean);
    for (const label of catalogLabels) {
      const guid = fnv1a64(label);
      const labels = labelSets.get(guid) || new Set();
      labels.add(label);
      labelSets.set(guid, labels);
    }
  }
  for (const [guid, labels] of labelSets) {
    if (labels.size === 1) result.set(guid, [...labels][0]);
  }
  return result;
}

function exportCommandMap(adefsPath, identityScanPath, catalogPath, outputPath) {
  if (!adefsPath || !identityScanPath || !catalogPath || !outputPath) {
    throw new Error('Usage: node export-adefs-command-map.js <native-adefs.json> <identity-scan.json> <event-project-catalog.txt> <output.json>');
  }
  if (fs.existsSync(outputPath)) throw new Error(`refusing to overwrite ${outputPath}`);

  const adefsBytes = fs.readFileSync(adefsPath);
  const scanBytes = fs.readFileSync(identityScanPath);
  const catalogBytes = fs.readFileSync(catalogPath);
  const adefs = JSON.parse(adefsBytes.toString('utf8'));
  const scan = JSON.parse(scanBytes.toString('utf8'));
  const catalogLineList = catalogBytes.toString('utf8').split(/\r?\n/);
  const catalogLines = new Set(catalogLineList);
  const eventNames = buildIdentityMap(scan, 'event', catalogLineList);
  const argumentNames = buildIdentityMap(scan, 'argument', catalogLineList);
  const aggregates = new Map();
  const events = [];

  for (const definition of adefs.definitions || []) {
    for (const state of definition.states || []) {
      const stateName = Object.values(state.fields || {}).find(value => typeof value === 'string' && /^\d+_/.test(value)) || null;
      for (const event of state.events || []) {
        const guid = String(event.guid);
        const command = eventNames.get(guid) || null;
        if (command && !catalogLines.has(command)) throw new Error(`event name ${command} (GUID ${guid}) is absent from the command catalog`);
        const args = (event.argumentIndices || []).map(index => {
          const arg = adefs.arguments?.[index];
          if (!arg) throw new Error(`event ${guid} references missing argument index ${index}`);
          const argGuid = String(arg.guid);
          return { index, guid: argGuid, name: argumentNames.get(argGuid) || null, type: arg.type, value: arg.value };
        });
        events.push({
          state: stateName,
          guid,
          command,
          value1: event.value1,
          flag: event.flag,
          value2: event.value2,
          value3: event.value3,
          triggerFrames: (event.triggers || []).map(trigger => trigger.value),
          arguments: args,
        });
        const aggregate = aggregates.get(guid) || { guid, command, count: 0, states: new Set(), value1: new Set(), triggerFrames: new Set(), argumentNames: new Set() };
        aggregate.count += 1;
        if (stateName) aggregate.states.add(stateName);
        aggregate.value1.add(String(event.value1));
        for (const trigger of event.triggers || []) aggregate.triggerFrames.add(String(trigger.value));
        for (const arg of args) aggregate.argumentNames.add(arg.name || `UNKNOWN:${arg.guid}`);
        aggregates.set(guid, aggregate);
      }
    }
  }

  const commands = [...aggregates.values()].sort((a, b) => (a.command || a.guid).localeCompare(b.command || b.guid)).map(row => ({
    guid: row.guid,
    command: row.command,
    count: row.count,
    states: [...row.states].sort(),
    value1: [...row.value1].sort(),
    triggerFrames: [...row.triggerFrames].map(Number).sort((a, b) => a - b),
    argumentNames: [...row.argumentNames].sort(),
  }));
  const report = {
    schema: 'aurora-forge/adefs-command-map/v1',
    inputs: {
      adefs: { path: adefsPath, bytes: adefsBytes.length, sha256: sha256(adefsBytes) },
      identityScan: { path: identityScanPath, bytes: scanBytes.length, sha256: sha256(scanBytes) },
      eventCatalog: { path: catalogPath, bytes: catalogBytes.length, sha256: sha256(catalogBytes) },
    },
    summary: {
      eventCount: events.length,
      uniqueEventGuidCount: aggregates.size,
      mappedEventGuidCount: [...aggregates.keys()].filter(guid => eventNames.has(guid)).length,
      mappedArgumentGuidCount: new Set(events.flatMap(event => event.arguments.map(arg => arg.guid)).filter(guid => argumentNames.has(guid))).size,
      unknownEventGuids: [...new Set(events.map(event => event.guid).filter(guid => !eventNames.has(guid)))],
      unknownArgumentGuids: [...new Set(events.flatMap(event => event.arguments.map(arg => arg.guid)).filter(guid => !argumentNames.has(guid)))],
    },
    interpretation: 'Names are exact FNV-1a64 identity matches to printable strings in the decoded global ADefs scan or identifier tokens from the AnimationEditor event_project catalog; event names are also required to occur as complete lines in that catalog. This labels the target ADefs graph; it does not prove source-to-target semantic equivalence.',
    commands,
    events,
  };
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
  return report;
}

if (require.main === module) {
  try {
    const report = exportCommandMap(...process.argv.slice(2));
    console.log(JSON.stringify({ output: process.argv[5], ...report.summary }, null, 2));
  } catch (error) {
    console.error(`Adefs command map export failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildIdentityMap, exportCommandMap, fnv1a64 };
