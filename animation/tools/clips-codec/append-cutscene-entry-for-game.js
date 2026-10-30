'use strict';

const { appendCutsceneEntry } = require('./append-cutscene-entry');
const { locateCutsceneVector } = require('./locate-cutscene-vector');
const { repairCutsceneF7 } = require('./repair-cutscene-f7');

function isWwe2K26(gameVersion) {
  return ['26', '2k26', 'wwe 2k26'].includes(String(gameVersion).trim().toLowerCase());
}

function appendCutsceneEntryForGame(buffer, options) {
  const firstAppendedIndex = locateCutsceneVector(buffer).count;
  const output = appendCutsceneEntry(buffer, options);
  const f7Repair = isWwe2K26(options.gameVersion)
    ? repairCutsceneF7(output, firstAppendedIndex)
    : null;
  return { output, firstAppendedIndex, f7Repair };
}

module.exports = { appendCutsceneEntryForGame, isWwe2K26 };
