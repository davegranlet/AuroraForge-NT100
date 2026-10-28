'use strict';
// adefs-payload-audit.js — independent check of the identity-transformed adefs payloads.
// Compares native nat273-pX.bin vs ours-pX.bin (14002):
//   1. locate every 273-token rename and the expected +2 splice,
//   2. verify all string length prefixes,
//   3. find u32 values that point at native string positions and verify each was
//      rebased by the cumulative growth before its target (a missed pointer is the
//      same defect class as the pair f15 issue),
//   4. list every byte difference unexplained by the rename splice.
const fs = require('node:fs');
const path = require('node:path');

const NATIVE_DIR = 'C:/nt100-codebasemain/animation/workflows/dolph-ziggler-1-2k19/outputs/work-order-005-package/payloads';
const OUR_DIR = NATIVE_DIR;
const PHASES = [0, 1, 2, 3, 4];
const TOKEN = /(^|\D)273(?=\D|$)/g;

function main() {
  const report = { schema: 'aurora-forge-parallel-companions/adefs-payload-audit-v1', generated: new Date().toISOString(), phases: [], pass: true };
  for (const pi of PHASES) {
    const nat = fs.readFileSync(path.join(NATIVE_DIR, `nat273-p${pi}.bin`));
    const our = fs.readFileSync(path.join(OUR_DIR, `ours-p${pi}.bin`));
    const expectedDelta = 54; // 27 tokens x +2 (verify below)

    // 1. locate renames: scan for 273 tokens inside printable/name contexts
    const renames = [];
    for (let p = 0; p < nat.length; p++) {
      if (nat[p] === 0x32 && nat[p + 1] === 0x37 && nat[p + 2] === 0x33) {
        const before = p === 0 ? 0 : nat[p - 1];
        const after = p + 3 < nat.length ? nat[p + 3] : 0;
        const isDigit = (c) => c >= 0x30 && c <= 0x39;
        if (!isDigit(before) && !isDigit(after) && before !== 0x32) {
          renames.push(p);
        }
      }
    }

    // 2. build expected splice
    const changes = renames.map((p) => ({ start: p, end: p + 3, delta: 2 })).sort((a, b) => a.start - b.start);
    const totalDelta = changes.reduce((n, c) => n + c.delta, 0);
    const insBefore = (x) => changes.reduce((n, c) => n + (c.end <= x ? c.delta : 0), 0);
    const mapPos = (x) => x + insBefore(x);
    const parts = [];
    let cursor = 0;
    for (const c of changes) { parts.push(nat.subarray(cursor, c.start)); parts.push(Buffer.from('14002', 'latin1')); cursor = c.end; }
    parts.push(nat.subarray(cursor));
    const expected = Buffer.concat(parts);
    // update the string length prefixes in the expected splice (4-byte LE before each token)
    for (const c of changes) {
      const lenPos = c.start - 4;
      if (lenPos < 0) continue;
      const natLen = nat.readUInt32LE(lenPos);
      expected.writeUInt32LE(natLen + c.delta, mapPos(lenPos));
    }

    // 3. length prefixes: for each rename, the string likely starts 4 bytes before (u32 len)
    const lengthChecks = [];
    for (const p of renames) {
      const lenPos = p - 4;
      if (lenPos < 0) continue;
      const natLen = nat.readUInt32LE(lenPos);
      const ourLenPos = mapPos(lenPos);
      const ourLen = our.readUInt32LE(ourLenPos);
      // sanity: native length should be >= token distance + remaining string chars
      const intact = ourLen === natLen + 2;
      lengthChecks.push({ tokenAt: p, lenPos, natLen, ourLen, updated: intact });
    }

    // 4. pointer rebase test: any u32 value equal to a native string start position,
    //    or any relative uoffset (pos + value) landing on a native string start
    const stringStarts = changes.map((c) => c.start);
    const stringSet = new Set(stringStarts);
    const pointerChecks = [];
    for (let p = 0; p + 4 <= nat.length; p++) {
      const v = nat.readUInt32LE(p);
      let target = null;
      if (stringSet.has(v)) target = v;                       // absolute pointer
      else if (v > 0 && v < nat.length && stringSet.has(p + v)) target = p + v; // uoffset
      if (target === null) continue;
      const np = mapPos(p);
      const ourV = our.readUInt32LE(np);
      const expectedV = target === v ? mapPos(v) : mapPos(target) - np;
      pointerChecks.push({ pos: p, target, expectedTarget: target === v ? mapPos(v) : mapPos(target), actualTarget: target === v ? ourV : np + ourV, ok: ourV === expectedV, kind: target === v ? 'absolute' : 'uoffset' });
    }

    // 5. unexplained diffs vs the expected splice
    const diffs = [];
    const n = Math.max(expected.length, our.length);
    for (let b = 0; b < n; b++) {
      const e = b < expected.length ? expected[b] : -1;
      const o = b < our.length ? our[b] : -1;
      if (e !== o) diffs.push({ pos: b, expected: e, actual: o });
    }

    const pointerFails = pointerChecks.filter((x) => !x.ok);
    const lengthFails = lengthChecks.filter((x) => !x.updated);
    const pass = our.length === nat.length + totalDelta && pointerFails.length === 0 && lengthFails.length === 0 && diffs.length === 0;
    report.phases.push({
      phase: pi, nativeBytes: nat.length, ourBytes: our.length, totalDelta,
      renames: renames.length, lengthChecks: lengthChecks.length, lengthFails,
      pointerChecks: pointerChecks.length, pointerFails,
      diffCount: diffs.length, diffs: diffs.slice(0, 40),
      pass,
    });
    if (!pass) report.pass = false;
    console.log(`phase p${pi}: renames=${renames.length} lenFails=${lengthFails.length} pointerChecks=${pointerChecks.length} pointerFails=${pointerFails.length} diffs=${diffs.length} -> ${pass ? 'PASS' : 'FAIL'}`);
    for (const f of pointerFails.slice(0, 6)) console.log('   PTR-FAIL', JSON.stringify(f));
    for (const d of diffs.slice(0, 6)) console.log('   DIFF', JSON.stringify(d));
  }
  fs.writeFileSync(path.join(__dirname, 'adefs-payload-audit.json'), JSON.stringify(report, null, 1));
  console.log(report.pass ? 'ALL PASS' : 'FAILURES PRESENT');
}
main();
