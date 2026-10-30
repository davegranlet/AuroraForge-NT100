'use strict';

const fs = require('node:fs');
const layout = require('../clips-layout');
const tool = require('../clips-tool');

function parse(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);
  return layout.parse(buffer, options);
}

function inspect(buffer) {
  const report = parse(buffer, { includeRaw: false });
  return {
    schema: 'aurora-forge-clips/v1',
    bytes: report.bytes,
    sha256: report.sha256,
    count: report.count,
    records: report.records.map((record) => ({
      index: record.index,
      id: record.id,
      offset: record.offset,
      length: record.length,
      fps: record.fps,
      frameValue: record.frameValue,
      trackCount: record.trackIdentifiers.length,
      group90Count: record.group90Profile.count,
      sha256: record.sha256,
    })),
  };
}

function inspectFile(file) {
  return inspect(fs.readFileSync(file));
}

function build(payloads) {
  return layout.build(payloads);
}

function list(file) {
  return tool.list(file);
}

function extract(file, index, output) {
  return tool.extract(file, index, output);
}

function inject(file, index, replacementFile, output) {
  return tool.inject(file, index, replacementFile, output);
}

function validate(file) {
  try {
    const report = layout.parseFile(file, { includeRaw: false });
    return { ok: true, bytes: report.bytes, count: report.count, sha256: report.sha256 };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

module.exports = {
  parse,
  inspect,
  inspectFile,
  build,
  list,
  extract,
  inject,
  validate,
  clipNameId: layout.clipNameId,
};
