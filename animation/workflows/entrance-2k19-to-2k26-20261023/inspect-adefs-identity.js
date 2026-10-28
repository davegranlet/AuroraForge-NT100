'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const file = path.resolve(process.argv[2]);
const tools = path.join(root, 'animation', 'tools');
const decoded = require(path.join(tools, 'adefs-file.js')).decode(fs.readFileSync(file), {
  workRoot: path.join(__dirname, 'adefs-inspect-work'),
  oodlePath: 'C:/SteamLibrary/steamapps/common/WWE 2K26/oo2core_9_win64.dll',
});
const model = require(path.join(tools, 'adefs-payload.js')).parsePayload(decoded.payload);
const names = [];
for (const definition of model.definitions) for (const state of definition.states) {
  for (const [field, value] of Object.entries(state.node)) {
    if (typeof value === 'string' && /1400\d/.test(value)) names.push({ field, value });
  }
}
console.log(JSON.stringify({ file, codec: decoded.codec, bytes: decoded.payload.length, definitions: model.definitions.length, names: [...new Map(names.map(x => [x.value, x])).values()] }, null, 2));
