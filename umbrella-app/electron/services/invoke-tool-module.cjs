'use strict';
const path = require('path');
const fs = require('fs');
function decode(value) {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') {
    if (Object.keys(value).length === 1 && typeof value.$file === 'string') return fs.readFileSync(value.$file);
    if (Object.keys(value).length === 1 && typeof value.$bigint === 'string') return BigInt(value.$bigint);
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decode(item)]));
  }
  return value;
}
async function main() {
  const [file, name, input] = process.argv.slice(2);
  const exported = require(path.resolve(file));
  if (!Object.prototype.hasOwnProperty.call(exported, name) || typeof exported[name] !== 'function') throw new Error('The module does not export that function');
  const args = decode(JSON.parse(input));
  if (!Array.isArray(args)) throw new Error('Function arguments must be a JSON array');
  const result = await exported[name](...args);
  process.stdout.write(JSON.stringify(result === undefined ? null : result, (_key, value) => typeof value === 'bigint' ? value.toString() : value, 2) + '\n');
}
main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
