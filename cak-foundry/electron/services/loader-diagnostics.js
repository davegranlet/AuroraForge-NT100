const fs = require('fs');
const path = require('path');

const MAX_LOG_BYTES = 1024 * 1024;
const MAX_LINES = 5000;
const MAX_ROWS = 500;

function readBoundedTail(filePath) {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('The loader log is not a regular local file.');
  const length = Math.min(stat.size, MAX_LOG_BYTES);
  const buffer = Buffer.alloc(length);
  const fd = fs.openSync(filePath, 'r');
  try { if (length) fs.readSync(fd, buffer, 0, length, stat.size - length); } finally { fs.closeSync(fd); }
  let raw = buffer.toString('utf8').replace(/\u0000/g, '');
  if (stat.size > length) raw = raw.slice(raw.indexOf('\n') + 1);
  const lines = raw.split(/\r?\n/).filter(Boolean).slice(-MAX_LINES);
  return { raw: lines.join('\n'), lines, truncated: stat.size > length, fileBytes: stat.size };
}

function parseLine(line) {
  const match = String(line).match(/^\[([^\]]+)]\s*(.*)$/);
  const timestamp = match ? match[1] : '';
  const message = match ? match[2] : String(line);
  let type = 'info'; let state = 'Found'; let subject = ''; let details = message;
  let value;
  if ((value = message.match(/^Mount call accepted for (.+?) \(files=(\d+), folders=(\d+)\)$/i))) { type = 'cak-accepted'; state = 'Mounted/registered'; subject = path.basename(value[1]); details = `${value[2]} files, ${value[3]} folders; confirm visible content in-game.`; }
  else if ((value = message.match(/^REJECTED CAK (.+?):\s*(.+)$/i))) { type = 'cak-rejected'; state = 'Rejected'; subject = path.basename(value[1]); details = value[2]; }
  else if ((value = message.match(/^ERROR mounting (.+?) \(files=(\d+), folders=(\d+)\)$/i))) { type = 'cak-failed'; state = 'Failed'; subject = path.basename(value[1]); details = `Validated archive was not accepted by the mount call (${value[2]} files, ${value[3]} folders).`; }
  else if ((value = message.match(/^Registered (Custom.+?\.pck) \(result=(\d+), id=(\d+)\)$/i))) { type = 'package-registered'; state = 'Mounted/registered'; subject = path.basename(value[1]); details = `Registration result ${value[2]}, package ID ${value[3]}; audible playback is not yet confirmed.`; }
  else if ((value = message.match(/^ERROR registering (.+?\.pck) \(result=(\d+), id=(\d+)\)$/i))) { type = 'package-failed'; state = 'Failed'; subject = path.basename(value[1]); details = `Registration result ${value[2]}, package ID ${value[3]}.`; }
  else if ((value = message.match(/^SUCCESS: LoadBankMemoryCopy result=(\d+), bank=(0x[0-9a-f]+), bytes=(\d+)$/i))) { type = 'bank-loaded'; state = 'Mounted/registered'; subject = 'Rebuilt music bank'; details = `Load result ${value[1]}, bank ${value[2]}, ${value[3]} bytes; audible playback is not yet confirmed.`; }
  else if (/LoadBankMemoryCopy/i.test(message) && /^ERROR/i.test(message)) { type = 'bank-failed'; state = 'Failed'; subject = 'Rebuilt music bank'; }
  else if (/unsupported game build/i.test(message)) { type = 'unsupported-build'; state = 'Failed'; subject = 'Executable compatibility'; }
  else if (/signature does not match/i.test(message)) { type = 'signature-mismatch'; state = 'Failed'; subject = 'Runtime signature'; }
  else if (/timed out|did not initialize/i.test(message)) { type = 'timeout'; state = 'Failed'; subject = 'Startup timing'; }
  else if (/^ERROR/i.test(message)) { type = 'error'; state = 'Failed'; }
  else if (/^WARNING/i.test(message)) { type = 'warning'; state = 'Needs setup'; }
  else if (/^Starting custom-music-only runtime/i.test(message)) { type = 'startup'; state = 'Found'; subject = 'Loader session'; }
  return { timestamp, type, state, subject, details };
}

function parseDiagnostics(lines) {
  const starts = [];
  lines.forEach((line, index) => { if (/Starting custom-music-only runtime/i.test(line)) starts.push(index); });
  const sessionLines = starts.length ? lines.slice(starts[starts.length - 1]) : lines;
  const rows = sessionLines.map(parseLine).filter((row) => row.type !== 'info').slice(-MAX_ROWS);
  const count = (type) => rows.filter((row) => row.type === type).length;
  const latestStart = rows.find((row) => row.type === 'startup');
  return {
    sessionStarted: latestStart ? latestStart.timestamp : '',
    rows,
    summary: {
      cakAccepted: count('cak-accepted'), cakRejected: count('cak-rejected'), cakFailed: count('cak-failed'),
      packagesRegistered: count('package-registered'), packagesFailed: count('package-failed'),
      bankLoad: count('bank-loaded') ? 'Mounted/registered' : (count('bank-failed') ? 'Failed' : 'Not reported'),
      unsupportedBuild: count('unsupported-build') > 0, signatureMismatch: count('signature-mismatch') > 0,
      startupTimeout: count('timeout') > 0, errors: rows.filter((row) => row.state === 'Failed').length
    }
  };
}

function createLoaderDiagnostics({ installRegistry }) {
  function read() {
    const install = installRegistry.getAll().wwe2k26;
    if (!install) return { found: false, reason: 'Choose the WWE 2K26 folder first.', raw: '', rows: [], summary: null };
    const logPath = path.join(install.root, 'DataCtrlLink-MusicOnly.log');
    if (!fs.existsSync(logPath)) return { found: false, reason: 'No Secure DataCtrlLink log has been created yet.', raw: '', rows: [], summary: null };
    const bounded = readBoundedTail(logPath);
    const parsed = parseDiagnostics(bounded.lines);
    return { found: true, truncated: bounded.truncated, fileBytes: bounded.fileBytes, raw: bounded.raw, ...parsed };
  }
  return { read };
}

module.exports = { createLoaderDiagnostics, parseDiagnostics, parseLine, readBoundedTail, MAX_LOG_BYTES, MAX_LINES, MAX_ROWS };
