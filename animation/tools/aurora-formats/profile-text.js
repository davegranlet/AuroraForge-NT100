'use strict';

const fs = require('node:fs');

const MAX_BYTES = 32 * 1024 * 1024;

const FORMAT_RULES = {
  propsprofile: { recordType: 'PROP', minFields: 8, maxFields: 8 },
  arenaprofile: { recordType: 'ProfileStart', minFields: 1, maxFields: 100000 },
};

function inferFormat(records) {
  const first = records.find((record) => !record.blank);
  if (!first) return null;
  if (first.recordType === 'PROP') return 'propsprofile';
  if (first.recordType === 'ProfileStart') return 'arenaprofile';
  return null;
}

function parse(input, options = {}) {
  const originalText = Buffer.isBuffer(input) ? input.toString('utf8') : String(input);
  if (originalText.length === 0) throw new Error('profile text is empty');
  if (originalText.length > MAX_BYTES) throw new Error('profile text exceeds size limit');
  if (originalText.includes('\u0000')) throw new Error('profile text contains NUL bytes');
  const bom = originalText.charCodeAt(0) === 0xfeff;
  const body = bom ? originalText.slice(1) : originalText;
  const eol = body.includes('\r\n') ? '\r\n' : '\n';
  const finalNewline = body.endsWith('\n');
  const lines = body.split(/\r?\n/);
  if (finalNewline && lines.length > 1) lines.pop();
  const records = lines.map((line, index) => {
    if (line === '') return { index, raw: line, blank: true };
    const terminated = line.endsWith(';');
    const content = terminated ? line.slice(0, -1) : line;
    const parts = content.split(',');
    return {
      index,
      raw: line,
      blank: false,
      terminated,
      recordType: parts[0],
      fields: parts.slice(1),
      rawFields: parts.slice(1),
    };
  });
  const format = options.format || inferFormat(records);
  const doc = {
    schema: 'aurora-forge-profile-text/v1',
    format,
    bom,
    eol,
    finalNewline,
    records,
    originalText,
    sourceBytes: Buffer.byteLength(originalText, 'utf8'),
  };
  if (options.validate !== false) {
    const result = validate(doc, options);
    if (!result.ok) throw new Error(result.errors.join('; '));
  }
  return doc;
}

function parseFile(file, options = {}) {
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error('input is not a file');
  if (stat.size <= 0 || stat.size > MAX_BYTES) throw new Error('input is outside size bounds');
  return parse(fs.readFileSync(file), options);
}

function isDirty(doc) {
  return doc.records.some((record) => {
    if (record.blank) return false;
    if (!Array.isArray(record.rawFields)) return true;
    return record.fields.length !== record.rawFields.length
      || record.fields.some((value, index) => value !== record.rawFields[index]);
  });
}

function validate(doc, options = {}) {
  const errors = [];
  const warnings = [];
  if (!doc || !Array.isArray(doc.records)) {
    return { ok: false, errors: ['document is missing records'], warnings };
  }
  const format = options.format || doc.format || inferFormat(doc.records);
  if (!format) errors.push('cannot infer profile format');
  const rule = FORMAT_RULES[format];
  if (format && !rule) errors.push(`unsupported profile format ${format}`);
  let dataRecords = 0;
  let fieldCount = null;
  for (const record of doc.records) {
    if (record.blank) continue;
    dataRecords += 1;
    if (!record.recordType) errors.push(`record ${record.index} has no record type`);
    if (rule && record.recordType !== rule.recordType) {
      errors.push(`record ${record.index} has type ${record.recordType}, expected ${rule.recordType}`);
    }
    if (!record.terminated) warnings.push(`record ${record.index} is missing the trailing semicolon`);
    if (fieldCount === null) fieldCount = record.fields.length;
    if (record.fields.length !== fieldCount) {
      warnings.push(`record ${record.index} has ${record.fields.length} fields, first record has ${fieldCount}`);
    }
    if (rule && record.fields.length < rule.minFields) {
      errors.push(`record ${record.index} has ${record.fields.length} fields, minimum is ${rule.minFields}`);
    }
    if (rule && record.fields.length > rule.maxFields) {
      errors.push(`record ${record.index} has ${record.fields.length} fields, maximum is ${rule.maxFields}`);
    }
    for (let index = 0; index < record.fields.length; index += 1) {
      if (record.fields[index] === '') {
        warnings.push(`record ${record.index} field ${index + 1} is empty`);
      }
    }
  }
  if (dataRecords === 0) errors.push('profile contains no data records');
  return { ok: errors.length === 0, errors, warnings, format, dataRecords, fieldCount };
}

function encode(doc) {
  if (!doc || !Array.isArray(doc.records)) throw new Error('document is missing records');
  if (!isDirty(doc) && typeof doc.originalText === 'string') return doc.originalText;
  const eol = doc.eol || '\n';
  const lines = doc.records.map((record) => {
    if (record.blank) return record.raw || '';
    if (Array.isArray(record.rawFields)
      && record.fields.length === record.rawFields.length
      && record.fields.every((value, index) => value === record.rawFields[index])) {
      return record.raw;
    }
    return `${record.recordType},${record.fields.join(',')}${record.terminated === false ? '' : ';'}`;
  });
  const text = lines.join(eol) + (doc.finalNewline ? eol : '');
  return doc.bom ? `\uFEFF${text}` : text;
}

function encodeFile(doc, file) {
  const text = encode(doc);
  fs.writeFileSync(file, text, { encoding: 'utf8', flag: 'wx' });
  return { file, bytes: Buffer.byteLength(text, 'utf8') };
}

function setField(doc, recordIndex, fieldIndex, value) {
  const record = doc.records[recordIndex];
  if (!record || record.blank) throw new Error(`record ${recordIndex} does not exist`);
  if (!Number.isInteger(fieldIndex) || fieldIndex < 0 || fieldIndex >= record.fields.length) {
    throw new Error(`field ${fieldIndex} is outside record ${recordIndex}`);
  }
  record.fields[fieldIndex] = String(value);
  return doc;
}

function summary(doc) {
  const validation = validate(doc, { format: doc.format });
  const counts = doc.records.filter((record) => !record.blank);
  return {
    schema: 'aurora-forge-profile-text-summary/v1',
    format: doc.format,
    bytes: doc.sourceBytes,
    records: counts.length,
    fields: counts.length ? counts[0].fields.length : 0,
    eol: doc.eol === '\r\n' ? 'CRLF' : 'LF',
    bom: Boolean(doc.bom),
    dirty: isDirty(doc),
    validation,
  };
}

module.exports = {
  FORMAT_RULES,
  MAX_BYTES,
  parse,
  parseFile,
  encode,
  encodeFile,
  validate,
  setField,
  summary,
  isDirty,
  inferFormat,
};
