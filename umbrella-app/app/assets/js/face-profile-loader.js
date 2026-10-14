(function () {
  'use strict';
  var MANIFEST_PATH = 'profiles/face/profiles.json';
  var PROFILE_BASE_PATH = 'profiles/face/';
  var state = { manifest: [], profiles: [], selectedProfile: null, selectedFilename: '', loadError: null };
  function byId(id) { return document.getElementById(id); }
  function cleanProfileForExport(profile) { var copy = JSON.parse(JSON.stringify(profile || {})); delete copy._source_filename; delete copy._source_path; return copy; }
  function normalizeManifest(manifest) {
    if (Array.isArray(manifest)) return manifest;
    if (manifest && Array.isArray(manifest.profiles)) return manifest.profiles;
    throw new Error('profiles.json must be an array of JSON filenames or an object with a profiles array.');
  }
  function profileId(profile) { return profile.profile_id || profile.id || ''; }
  function profileLabel(profile) { var id = profileId(profile); var name = profile.display_name || id; return name + (id && id !== name ? ' (' + id + ')' : ''); }
  function setStatus(message, isError) { var status = byId('faceProfileLoadStatus'); if (!status) return; status.textContent = message || ''; status.className = isError ? 'copy-status profile-error' : 'copy-status'; }
  function loadJson(path) { return fetch(path, { cache: 'no-store' }).then(function (response) { if (!response.ok) throw new Error('Could not load ' + path + ' (' + response.status + ')'); return response.json(); }); }
  function populateProfileDropdown() {
    var select = byId('faceMappingProfile'); if (!select) return; select.innerHTML = '';
    state.profiles.forEach(function (profile) { var option = document.createElement('option'); option.value = profile._source_filename || profileId(profile); option.textContent = profileLabel(profile); select.appendChild(option); });
    if (state.profiles.length) { state.selectedProfile = state.profiles[0]; state.selectedFilename = state.selectedProfile._source_filename || ''; select.value = state.selectedFilename; }
  }
  function selectProfile(filenameOrId) {
    var found = state.profiles.find(function (profile) { return profile._source_filename === filenameOrId || profileId(profile) === filenameOrId; });
    if (!found && state.profiles.length) found = state.profiles[0];
    state.selectedProfile = found || null; state.selectedFilename = found ? (found._source_filename || '') : '';
    document.dispatchEvent(new CustomEvent('faceProfileChanged', { detail: { profile: state.selectedProfile } }));
    return state.selectedProfile;
  }
  function initProfileDropdown() { var select = byId('faceMappingProfile'); if (!select) return; select.addEventListener('change', function () { selectProfile(select.value); }); }
  function loadProfiles() {
    setStatus('Loading face profiles…');
    return loadJson(MANIFEST_PATH).then(function (manifest) {
      state.manifest = normalizeManifest(manifest);
      if (!state.manifest.length) throw new Error('profiles.json is empty.');
      return Promise.all(state.manifest.map(function (filename) {
        var safeName = String(filename || '').replace(/^\/+/, '');
        if (!/\.json$/i.test(safeName)) throw new Error('Manifest entry is not a JSON file: ' + safeName);
        return loadJson(PROFILE_BASE_PATH + safeName).then(function (profile) { profile._source_filename = safeName; profile._source_path = PROFILE_BASE_PATH + safeName; return profile; });
      }));
    }).then(function (profiles) {
      state.profiles = profiles; populateProfileDropdown(); initProfileDropdown();
      setStatus('Loaded ' + profiles.length + ' face profile' + (profiles.length === 1 ? '' : 's') + '.');
      document.dispatchEvent(new CustomEvent('faceProfilesReady', { detail: { profiles: profiles } }));
      selectProfile(state.selectedFilename);
      return profiles;
    }).catch(function (error) {
      state.loadError = error; setStatus('Face profile load error: ' + error.message, true); document.dispatchEvent(new CustomEvent('faceProfilesError', { detail: { error: error } }));
    });
  }
  window.FaceProfileLoader = { loadProfiles: loadProfiles, getProfiles: function () { return state.profiles.slice(); }, getManifest: function () { return state.manifest.slice(); }, getSelectedProfile: function () { return state.selectedProfile; }, getSelectedFilename: function () { return state.selectedFilename; }, cleanProfileForExport: cleanProfileForExport, profileId: profileId, profileLabel: profileLabel };
  document.addEventListener('DOMContentLoaded', loadProfiles);
})();
