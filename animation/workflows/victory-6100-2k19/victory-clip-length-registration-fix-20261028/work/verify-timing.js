'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { parse } = require('../../../../tools/clips-layout');

const [clipsPath, adefsJsonPath, jsfbPath, registrationPath, outPath] = process.argv.slice(2);
if (!clipsPath || !adefsJsonPath || !jsfbPath || !registrationPath || !outPath) {
  throw new Error('Usage: node verify-timing.js <clips> <adefs-export.json> <jsfb> <registration-verify.json> <out.json>');
}

const clipsBytes = fs.readFileSync(path.resolve(clipsPath));
const clips = parse(clipsBytes, { includeRaw: false });
const clipFrames = [...new Set(clips.records.map((record) => record.frameValue))];
const clipFps = [...new Set(clips.records.map((record) => record.fps))];
const clipIds = clips.records.map((record) => record.id);

const adefs = JSON.parse(fs.readFileSync(path.resolve(adefsJsonPath), 'utf8'));
const states = adefs.definitions.flatMap((definition) => definition.states);
const nodeEnds = states.map((state) => state.node['2027243719']);
const events = states.flatMap((state) => state.events);
const triggerHash = '8950987144096290878';
const setPlace = events.filter((event) => event.value1 === 390)
  .map((event) => ({ command: 'SetPlace', value: event.triggers.find((trigger) => trigger.hash === triggerHash)?.value ?? null, triggers: event.triggers }));
const setPose = events.filter((event) => event.value1 === 389)
  .map((event) => ({ command: 'SetPose', value: event.triggers.find((trigger) => trigger.hash === triggerHash)?.value ?? null, triggers: event.triggers }));
const timingValues = [...setPlace, ...setPose].map((entry) => entry.value).filter((value) => Number.isFinite(value));
const finalPairValue = Math.max(...timingValues);

const jsfbBytes = fs.readFileSync(path.resolve(jsfbPath));
const jsfbField = jsfbBytes.readUInt32LE(1468);
const registration = JSON.parse(fs.readFileSync(path.resolve(registrationPath), 'utf8'));

const report = {
  schema: 'aurora-forge/victory-clip-length-registration-source-timing/v1',
  generatedUtc: new Date().toISOString(),
  clips: {
    path: path.resolve(clipsPath),
    bytes: clipsBytes.length,
    records: clips.count,
    frames: clipFrames,
    fps: clipFps,
    uniqueIds: new Set(clipIds).size,
    trackCounts: clips.records.map((record) => record.trackIdentifiers.length),
    all2421FramesAt60Fps: clips.count === 16 && clipFrames.length === 1 && clipFrames[0] === 2421 && clipFps.length === 1 && clipFps[0] === 60,
  },
  adefs: {
    path: path.resolve(adefsJsonPath),
    definitions: adefs.definitions.length,
    states: states.length,
    eventCount: events.length,
    nodeEnds,
    maxNodeEnd: Math.max(...nodeEnds),
    setPlace,
    setPose,
    finalPairValue,
  },
  jsfb: {
    path: path.resolve(jsfbPath),
    fieldOffset: 1468,
    fieldWidth: 4,
    fieldValue: jsfbField,
    staleBaselineValue: 1754,
    corrected: jsfbField === 2420,
  },
  registration: {
    path: path.resolve(registrationPath),
    cdefSize: registration.cdefSize,
    adefsEndFrame: registration.adefsEndFrame,
    definitionCount: registration.definitionCount,
    stateCount: registration.stateCount,
    eventCount: registration.eventCount,
    pass: registration.pass,
  },
  finalPairWithinRegisteredEnd: finalPairValue < registration.cdefSize && finalPairValue < jsfbField && registration.cdefSize === 2420 && jsfbField === 2420,
  finalPairOutsideStaleEnd: finalPairValue > 1754,
  pass: clips.count === 16
    && clipFrames.length === 1 && clipFrames[0] === 2421
    && clipFps.length === 1 && clipFps[0] === 60
    && new Set(clipIds).size === 16
    && adefs.definitions.length === 20
    && states.length === 20
    && events.length === 87
    && Math.max(...nodeEnds) === 2420
    && jsfbField === 2420
    && registration.cdefSize === 2420
    && registration.adefsEndFrame === 2420
    && registration.definitionCount === 20
    && registration.stateCount === 20
    && registration.eventCount === 87
    && registration.pass === true
    && Math.abs(finalPairValue - 1821.2086181640625) < 1e-9
    && finalPairValue < 2420
    && finalPairValue > 1754,
};
fs.writeFileSync(path.resolve(outPath), `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' });
console.log(JSON.stringify({
  out: path.resolve(outPath),
  clips: { records: report.clips.records, frames: report.clips.frames, fps: report.clips.fps },
  adefs: { definitions: report.adefs.definitions, states: report.adefs.states, eventCount: report.adefs.eventCount, maxNodeEnd: report.adefs.maxNodeEnd, finalPairValue: report.adefs.finalPairValue, setPlaceValues: setPlace.map((entry) => entry.value), setPoseValues: setPose.map((entry) => entry.value) },
  jsfbField,
  cdefSize: registration.cdefSize,
  finalPairWithinRegisteredEnd: report.finalPairWithinRegisteredEnd,
  finalPairOutsideStaleEnd: report.finalPairOutsideStaleEnd,
  pass: report.pass,
}, null, 2));
