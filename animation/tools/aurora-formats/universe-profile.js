'use strict';

const fs = require('node:fs');

const ARRAY_KEYS = ['shows','roster','rosters','titles','rivalries','divisions','statusEffects','drafts','titleHistory','matchTables','brands'];

function parse(input) {
  let value = input;
  if (Buffer.isBuffer(value)) value = value.toString('utf8');
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch (error) { throw new Error(`invalid Universe profile JSON: ${error.message}`); }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Universe profile must be a JSON object');
  return value;
}

function inspect(input) {
  const value = parse(input);
  const arrays = {};
  for (const [key, item] of Object.entries(value)) {
    if (Array.isArray(item)) arrays[key] = item.length;
  }
  return {
    schema: 'aurora-forge-universe-profile/v1',
    bytes: Buffer.byteLength(JSON.stringify(value), 'utf8'),
    topLevelKeys: Object.keys(value),
    arrays,
    schemaVersion: value.schemaVersion ?? value.schema_version ?? value.version ?? null,
  };
}

function validate(input) {
  try {
    const value = parse(input);
    const errors = [];
    if (value.profile && typeof value.profile !== 'object') errors.push('profile must be an object');
    for (const key of ARRAY_KEYS) {
      if (key in value && !Array.isArray(value[key])) errors.push(`${key} must be an array`);
    }
    return { ok: errors.length === 0, errors, topLevelKeys: Object.keys(value) };
  } catch (error) {
    return { ok: false, errors: [error.message] };
  }
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function merge(base, overlay) {
  const left = parse(base);
  const right = parse(overlay);
  function walk(a, b) {
    const out = { ...a };
    for (const [key, value] of Object.entries(b)) {
      if (isObject(value) && isObject(out[key])) out[key] = walk(out[key], value);
      else out[key] = value;
    }
    return out;
  }
  return walk(left, right);
}

function readFile(file) {
  return parse(fs.readFileSync(file));
}

function inspectFile(file) {
  return inspect(readFile(file));
}

module.exports = { ARRAY_KEYS, parse, inspect, inspectFile, validate, merge, readFile };
