'use strict';
(async function () {
  const api = window.WWE2K26Desktop.toolLibrary;
  const element = id => document.getElementById(id);
  let tools = [], cwd = '';
  function selected() { return tools.find(tool => tool.id === element('tools').value); }
  function render() {
    const filter = element('search').value.toLowerCase();
    element('tools').replaceChildren(...tools.filter(tool => tool.id.toLowerCase().includes(filter)).map(tool => {
      const option = document.createElement('option'); option.value = tool.id; option.textContent = tool.id; return option;
    }));
    describe();
  }
  function applyLaunchRequest() {
    const query = new URLSearchParams(location.search);
    const requested = query.get('tool');
    const actionName = query.get('action');
    if (requested) {
      const match = tools.find(tool => tool.id.endsWith(requested) || tool.id === requested);
      if (match) {
        element('search').value = match.id;
        render();
        element('tools').value = match.id;
        describe();
        if (actionName) element('args').value = JSON.stringify([actionName]);
      }
    }
  }
  function describe() {
    const tool = selected();
    element('details').textContent = tool ? tool.runtime + ' — SHA-256 ' + tool.sha256 : 'Select a tool';
    element('run').disabled = !tool || !['node-cli', 'node-module', 'python', 'powershell', 'dotnet-project'].includes(tool.runtime);
    element('function-row').hidden = !tool || tool.runtime !== 'node-module';
  }
  async function action(work) { try { await work(); } catch (error) { element('output').textContent = error.message; } }
  element('search').oninput = render;
  element('tools').onchange = describe;
  element('source').onclick = () => action(async () => { element('output').textContent = await api.source(selected().id); });
  element('folder').onclick = () => action(async () => { cwd = await api.chooseFolder(); element('cwd').textContent = cwd || ''; });
  element('run').onclick = () => action(async () => {
    element('run').disabled = true;
    element('output').textContent = 'Running…';
    try { const result = await api.run({ id: selected().id, args: JSON.parse(element('args').value), cwd, functionName: element('function').value }); element('output').textContent = 'Exit: ' + result.code + '\n' + result.stdout + '\n' + result.stderr; }
    finally { describe(); }
  });
  await action(async () => { tools = await api.list(); render(); applyLaunchRequest(); });
})();
