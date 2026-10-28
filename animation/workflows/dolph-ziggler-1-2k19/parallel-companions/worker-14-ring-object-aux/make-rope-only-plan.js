'use strict';
// Derive a bounded rope-only plan from the reviewed Worker-14 plan.
// Ring-mat swaps stay excluded so the rope companion can be verified independently.
const fs = require('node:fs');
const path = require('node:path');
const src = path.join(__dirname, 'out', 'plan.json');
const out = path.join(__dirname, 'out', 'plan-rope-only.json');
const plan = JSON.parse(fs.readFileSync(src, 'utf8'));
for (const file of plan.files) file.swaps = file.swaps.filter((s) => /rope-(r14|r15)\.payload\.bin$/.test(s.payloadFile));
plan.files = plan.files.filter((file) => file.swaps.length);
plan.schema = 'aurora-forge/worker14-ring-object-rope-only-plan/v1';
plan.parentPlan = src;
plan.scope = 'phase-130 rope r14/r15 only; all ring-mat swaps excluded';
fs.writeFileSync(out, JSON.stringify(plan, null, 1) + '\n', { flag: 'wx' });
console.log(out);
