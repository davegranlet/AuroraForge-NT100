'use strict';
// final-qa: parse ffmpeg signalstats luminance timelines + scene-cut lists into machine evidence.
const fs = require('node:fs');
const path = require('node:path');
const V = path.join(__dirname, 'video');

function parseLum(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const frames = [];
  let t = null;
  for (const line of lines) {
    const m = /pts_time:([0-9.]+)/.exec(line);
    if (m) { t = parseFloat(m[1]); continue; }
    const v = /YAVG=([0-9.]+)/.exec(line);
    if (v && t !== null) { frames.push({ t, y: parseFloat(v[1]) }); t = null; }
  }
  return frames;
}
function parseScenes(file) {
  if (!fs.existsSync(file)) return [];
  const txt = fs.readFileSync(file, 'utf8');
  const times = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = /pts_time:([0-9.]+)/.exec(line);
    if (m && /showinfo/.test(line) === false && /Parsed_showinfo|n:\s*\d+/.test(line)) times.push(parseFloat(m[1]));
  }
  return times;
}
const out = { schema: 'aurora-forge-final-qa-video-timeline/v1', generated: new Date().toISOString(), videos: {} };
for (const tag of ['0FAE', '9D94', '673B']) {
  const frames = parseLum(path.join(V, `lum_${tag}.txt`));
  const scenes = parseScenes(path.join(V, `scenes_${tag}.txt`));
  const n = frames.length;
  const mean = frames.reduce((a, f) => a + f.y, 0) / n;
  const dark = frames.filter((f) => f.y < 6).map((f) => f.t);
  const darkWindows = [];
  for (const t of dark) {
    const last = darkWindows[darkWindows.length - 1];
    if (last && t - last.end <= 0.4) last.end = t; else darkWindows.push({ start: t, end: t });
  }
  const bright = frames.filter((f) => f.y >= 6);
  out.videos[tag] = {
    frames: n, duration: frames[n - 1].t,
    yMean: +mean.toFixed(2),
    yMin: Math.min(...frames.map((f) => f.y)),
    yMax: Math.max(...frames.map((f) => f.y)),
    darkWindows: darkWindows.map((w) => ({ start: +w.start.toFixed(2), end: +w.end.toFixed(2), seconds: +(w.end - w.start + 0.2).toFixed(1) })),
    sceneCuts: scenes,
  };
  console.log(tag, 'frames', n, 'dur', frames[n - 1].t.toFixed(2), 'yAvg', mean.toFixed(1), 'yMin', out.videos[tag].yMin,
    '| darkWindows', JSON.stringify(out.videos[tag].darkWindows),
    '| cuts', scenes.length);
}
fs.writeFileSync(path.join(__dirname, 'video-timeline.json'), JSON.stringify(out, null, 1), 'utf8');
console.log('video-timeline.json written');
