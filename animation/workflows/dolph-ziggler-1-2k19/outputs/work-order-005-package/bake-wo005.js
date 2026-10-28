'use strict';
// bake-wo005.js - bake the offline archive DIRECTLY under the intended basename (order 005 P1.1).
// Uncompressed bake (no oodle/helper options) matching the accepted mod-slot convention.
// Never rename the baked output. Run only after assemble-wo005.js.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const repackager = require('C:/nt100-codebasemain/cak-foundry/electron/archive-repackager.js');

const dir = __dirname;
const staging = path.join(dir, 'staging');
const output = path.join(dir, 'aurora-2k25-replace-mod.cak'); // intended basename, baked in place
if (!fs.existsSync(staging)) throw new Error('staging/ missing - run assemble-wo005.js first');
if (fs.existsSync(output)) fs.rmSync(output);
const result = repackager.buildCak(staging, output, {}); // no oodle/helper => uncompressed
const buf = fs.readFileSync(output);
console.log(JSON.stringify({ ...result, output, bytes: buf.length, sha256: crypto.createHash('sha256').update(buf).digest('hex') }, null, 2));
