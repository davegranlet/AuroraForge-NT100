const fs=require('fs');
const r=require('./scan.json');
const q=x=>`"${String(x??'').replace(/"/g,'""')}"`;
const rows=[['path','bytes','sha256','raw_markers','jsfb_parse_status'],...r.files.map(f=>[f.path,f.bytes,f.sha256,(f.rawIdentityMatches||[]).map(m=>m.label+' x'+m.count).join(';'),f.jsfbParseSkipped?'not parsed: '+f.jsfbParseSkipped:'deep parsed'])];
fs.writeFileSync('./FILES.csv',rows.map(a=>a.map(q).join(',')).join('\r\n')+'\r\n',{flag:'wx'});
