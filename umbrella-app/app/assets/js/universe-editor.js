'use strict';
(function () {
  const api = window.WWE2K26Desktop.universeProfile;
  const $ = id => document.getElementById(id);
  let file = '';
  function show(value) { $('output').textContent = JSON.stringify(value, null, 2); }
  $('choose').onclick = async () => { const result = await api.chooseFile(); if (!result.canceled) { file = result.path; $('file').textContent = file; show(await api.inspect(file)); } };
  $('inspect').onclick = async () => { if (file) show(await api.inspect(file)); };
})();
