'use strict';
const fs = require('fs');
const path = require('path');

function createUniverseProfileService(options = {}) {
  const universeModulePath = options.universeModulePath || path.join(__dirname, '..', '..', '..', 'animation', 'tools', 'aurora-formats', 'universe-profile.js');
  if (!fs.existsSync(universeModulePath)) throw new Error(`Universe profile module was not found: ${universeModulePath}`);
  const universe = require(universeModulePath);
  function read(file) { return universe.readFile(path.resolve(file)); }
  function inspect(file) { return { file: path.resolve(file), ...universe.inspectFile(path.resolve(file)), validation: universe.validate(read(file)) }; }
  function mergePreview(baseFile, overlayFile) { return universe.merge(read(baseFile), read(overlayFile)); }
  function saveCopy(sourceFile, outputFile, overlay) {
    const source = path.resolve(sourceFile); const target = path.resolve(outputFile);
    if (source === target) throw new Error('Universe profile output must be a separate copy');
    const value = overlay ? universe.merge(read(source), overlay) : read(source);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify(value, null, 2) + '\n', 'utf8');
    return inspect(target);
  }
  return { inspect, mergePreview, saveCopy };
}
module.exports = { createUniverseProfileService };
