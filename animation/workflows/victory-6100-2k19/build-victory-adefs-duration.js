'use strict';
// Retarget the donor Victory ADefs duration/triggers from 1754 to the source body/facial end frame 2420.
// This preserves the donor event order and relative timing; it is not source-event conversion.
const fs=require('node:fs');
const path=require('node:path');
const adefs=require('../../tools/adefs-file');
const root=__dirname;
const input=path.join(root,'candidate-clean-victory/Animation/Victory/14003.adefs');
const output=path.join(root,'source-pose-audit/14003-2420.adefs');
const options={
  workRoot:path.join(root,'adefs-work-rescale'),
  oodlePath:'C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll',
  helperPath:path.resolve('C:/nt100-codebasemain/umbrella-app/app/tools/cak-helper/AuroraCakHelper.exe')
};
if(fs.existsSync(output))fs.rmSync(output);
const result=adefs.rescaleFile(input,output,2420,options);
const check=adefs.inspect(output,options);
const report={schema:'aurora-forge/victory-adefs-duration/v1',result,inspect:check,limits:['Donor event composition retimed to source duration; source 0FOP event conversion is not claimed.']};
fs.writeFileSync(path.join(root,'source-pose-audit/adefs-duration-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
