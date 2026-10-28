'use strict';
// patch-clipnameid.js - fix clipNameId to lowercase the input (audit-proven rule), keep a self-test.
const fs = require('fs');
const paths = [
  'C:/nt100-codebasemain/animation/tools/clips-layout.js',
  'C:/nt100-codebasemain/animation/tools/clips-layout.js',
];
for (const p of paths) {
  if (!fs.existsSync(p)) { console.log('missing:', p); continue; }
  let src = fs.readFileSync(p, 'utf8');
  const needle = "for (const byte of Buffer.from(name, 'utf8'))";
  if (!src.includes(needle)) { console.log('pattern not found:', p); continue; }
  src = src.replace(needle, "for (const byte of Buffer.from(name.toLowerCase(), 'utf8'))");
  // fix the stale comment text (two known variants)
  src = src.replace(
    "// Measured against the supplied `Clip #63036 [63036a000].clip` record: the\n// on-disk 64-bit identifier is lowercase UTF-8 FNV-1a of the clip name.",
    "// Measured on native + community fixtures: the on-disk 64-bit identifier is\n// FNV-1a 64 of the LOWERCASED clip name (273_a_00_M_facial -> 0xC93E7DDB8B7141E1)."
  );
  fs.writeFileSync(p, src);
  console.log('patched:', p);
}
try {
  delete require.cache[require.resolve('C:/nt100-codebasemain/animation/tools/clips-layout.js')];
  const { clipNameId } = require('C:/nt100-codebasemain/animation/tools/clips-layout.js');
  const a = clipNameId('273_a_00_M_facial');
  const b = clipNameId('273_a_00_m_facial');
  console.log('273_a_00_M_facial ->', a, '| 273_a_00_m_facial ->', b, '| equal-after-lowercase:', a === b, '| expected 0xC93E7DDB8B7141E1:', a === '0xC93E7DDB8B7141E1');
} catch (e) { console.log('self-test failed to run:', e.message); }
