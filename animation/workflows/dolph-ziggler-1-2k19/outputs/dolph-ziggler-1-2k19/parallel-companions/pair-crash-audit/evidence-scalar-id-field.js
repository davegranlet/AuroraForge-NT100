'use strict';
// evidence-scalar-id-field.js — records the family evidence for the field the writer
// corrupts: vtable shape "22/20/6,8,7,12,0,0,0,0,16", field index 1. Values are the
// definition ids {12,60,61,62,63}; in 1002273.jsfb the value 60 is a plain scalar,
// which proves the field is numeric (not an offset) and the writer's patch of the
// 1000273-family instances depends on a coincidental target validation.
const fs = require('node:fs');
const path = require('node:path');
const { walk } = require('./pair-graph-walk');

const DIR = 'D:/games/2k26-extracts-2/aurora-full-extract-v116-20260903-221507/Root/Cutscene/CaeAdvanced';
const FAMILY = ['1000273.jsfb', '1100273.jsfb', '1200273.jsfb', '1300273.jsfb', '1400273.jsfb', '1002273.jsfb', '1006273.jsfb'];
const KEY = '22/20/6,8,7,12,0,0,0,0,16';

const out = { schema: 'aurora-forge-parallel-companions/suspect-field-evidence-v1', generated: new Date().toISOString(), typeKey: KEY, fixtures: [] };
for (const f of FAMILY) {
  const file = path.join(DIR, f);
  if (!fs.existsSync(file)) continue;
  const buf = fs.readFileSync(file);
  const graph = walk(buf);
  const instances = [];
  for (const t of graph.tables) {
    const key = `${t.vtable.vsize}/${t.vtable.tsize}/${t.vtable.fields.join(',')}`;
    if (key !== KEY) continue;
    const fld = t.fields.find((x) => x.index === 1);
    if (!fld || fld.kind === 'absent') continue;
    const value = buf.readUInt32LE(fld.fieldPos);
    instances.push({
      tablePos: t.pos, fieldPos: fld.fieldPos, value,
      instanceKind: fld.kind,
      resolvesTo: fld.target !== undefined ? `0x${Number(fld.target).toString(16)}` : null,
      targetIsRealObject: fld.kind !== 'scalar',
    });
  }
  out.fixtures.push({ file: f, instances });
  console.log(f, instances.map((i) => `${i.value}:${i.instanceKind}`).join(' '));
}
fs.writeFileSync(path.join(__dirname, 'suspect-field-evidence.json'), JSON.stringify(out, null, 1));
console.log('written suspect-field-evidence.json');
