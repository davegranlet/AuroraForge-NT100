'use strict';

// Game identity metadata. The per-game compatibility data (executable hash,
// loader hash, host executable name) lives in app/data/compatibility/ and is
// loaded by the caller; this module only supplies the stable display/identity
// facts and the ordered list of supported game ids.

const GAME_PROFILES = Object.freeze({
  wwe2k26: { gameId: 'wwe2k26', displayName: 'WWE 2K26' },
  wwe2k25: { gameId: 'wwe2k25', displayName: 'WWE 2K25' },
  wwe2k19: { gameId: 'wwe2k19', displayName: 'WWE 2K19' }
});

const GAME_IDS = Object.freeze(Object.keys(GAME_PROFILES));

function gameProfile(gameId) {
  return GAME_PROFILES[gameId] || GAME_PROFILES.wwe2k26;
}

module.exports = { GAME_PROFILES, GAME_IDS, gameProfile };
