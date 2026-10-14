'use strict';

// Game-version registry for CAK tooling. One table drives the explorer's
// version dropdown, archive auto-detection labels, and engine routing.
const GAME_CAK_ENGINES = Object.freeze({
  '2k19': { label: 'WWE 2K19', kind: 'pac', note: '2K19 stores PAC archives (not CAK). Use the PAC Explorer.' },
  '2k20': { label: 'WWE 2K20', kind: 'reader20', note: '2K20 CAKs use the dedicated 2K20 workbench reader.' },
  '2k22': { label: 'WWE 2K22', kind: 'js' },
  '2k23': { label: 'WWE 2K23', kind: 'js' },
  '2k24': { label: 'WWE 2K24', kind: 'js' },
  '2k25': { label: 'WWE 2K25', kind: 'native93', note: '2K25 CAKs are FDIR 9.3, opened by the bundled native backend.' },
  '2k26': { label: 'WWE 2K26', kind: 'js', note: '2K26 CAKs are FDIR 9.9, opened by the built-in reader.' },
});

const FDIR_TITLES = Object.freeze({
  '8.3': 'WWE 2K22/2K23',
  '9.0': 'WWE 2K24-series',
  '9.3': 'WWE 2K25',
  '9.9': 'WWE 2K26',
});

function titleForFdir(major, minor) {
  return FDIR_TITLES[`${major}.${minor}`] || `FDIR ${major}.${minor}`;
}

function engineForGame(gameId) {
  return GAME_CAK_ENGINES[String(gameId || '').toLowerCase()] || null;
}

module.exports = { GAME_CAK_ENGINES, titleForFdir, engineForGame };
