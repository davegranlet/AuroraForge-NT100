'use strict';
const fs = require('fs');
const path = require('path');
const r = require('../electron/cak-reader');
const archive = r.openArchive(process.argv[2]);
const root = process.argv[3];
const targets = new Set(archive.fileHashes.map(x => x.hash).concat(archive.folderHashes.map(x => x.hash)));
const dirs = [];
const freq = new Map();
const stack = [root];
while (stack.length) {
  const cur = stack.pop(); const relDir = path.relative(root, cur).replace(/\\/g, '/').toLowerCase(); if (relDir) dirs.push(relDir);
  for (const e of fs.readdirSync(cur, {withFileTypes:true})) {
    const full = path.join(cur,e.name); if(e.isDirectory()) stack.push(full); else if(e.isFile()) freq.set(e.name.toLowerCase(),(freq.get(e.name.toLowerCase())||0)+1);
  }
}
const bases=[...freq].sort((a,b)=>b[1]-a[1]).slice(0,Number(process.argv[4]||500)).map(x=>x[0]);
let found=0; const sample=[]; const started=Date.now();
for (const d of dirs) for(const b of bases) { const c=d+'/'+b; const h=r.fnv1a64(c); if(targets.has(h)){found++;if(sample.length<20)sample.push(c);} }
console.log(JSON.stringify({dirs:dirs.length,bases:bases.length,attempts:dirs.length*bases.length,found,ms:Date.now()-started,sample},null,2));
