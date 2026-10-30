const capabilities = [
  { title: 'AuroraForge NT100 Beta 4', kind: 'APP SHELL', status: 'experimental', games: '2K19 / 2K20 / 2K22 / 2K23 / 2K24 / 2K25 / 2K26', description: 'Free unified WWE 2K modding app covering loader, CAK, creator workflow, validation, logs, and releases.' },
  { title: '100% Not TRIBUTE', kind: 'CREATOR', status: 'experimental', games: '2K25 / 2K26', description: 'Complete feature-for-feature TRIBUTE replacement built inside AuroraForge NT100, not bolted on as a separate app.' },
  { title: '2K19 to Modern Animation Converter', kind: 'CONVERTER', status: 'experimental', games: '2K19 / 2K20 / 2K22 / 2K23 / 2K24 / 2K25 / 2K26', description: 'Major Beta 4 feature for bringing 2K19 animations forward into modern WWE 2K workflows.' },
  { title: 'Aurora CAK Foundry', kind: 'ARCHIVES', status: 'ready', games: '2K22 / 2K23 / 2K24 / 2K25 / 2K26', description: 'Read, extract, bake, rebuild, reopen, and verify CAK archives without overwriting stock files.' },
  { title: 'Secure DataCtrlLink', kind: 'LOADER', status: 'ready', games: '2K25 / 2K26', description: 'Controlled in-game loader path and Aurora replacement for the CakeHook-style loader role.' },
  { title: 'AuroraForge NT100 DDS Converter', kind: 'TEXTURES', status: 'ready', games: '2K19 through 2K26', description: 'Safe DDS and PNG conversion using the included DirectXTex workflow.' },
  { title: 'NT100 Creation Suite', kind: 'CREATION', status: 'experimental', games: 'All supported workflows', description: 'Aurora-first creator workflow for characters, textures, arenas, factions, and mod planning. This is the part nobody else has.' },
  { title: 'Animation Research', kind: 'RESEARCH', status: 'research', games: '2K19 / 2K20 / 2K25 / 2K26', description: 'Evidence-backed probes and format research with boundaries kept visible.' },
  { title: 'PAC & Archive Explorers', kind: 'ARCHIVES', status: 'ready', games: '2K19 / 2K20 / 2K25', description: 'First-party readers and controlled rebuild paths for supported archive formats.' }
];

const grid = document.querySelector('#catalog-grid');
const empty = document.querySelector('#catalog-empty');
const search = document.querySelector('#catalog-search');
const status = document.querySelector('#catalog-status');

if (grid && empty && search && status) {
  function renderCatalog() {
    const query = (search.value || '').trim().toLowerCase();
    const filter = status.value;
    const matches = capabilities.filter((item) => {
      const haystack = `${item.title} ${item.kind} ${item.games} ${item.description}`.toLowerCase();
      return (!query || haystack.includes(query)) && (filter === 'all' || item.status === filter);
    });
    grid.innerHTML = matches.map((item) => `
      <article class="catalog-card">
        <div class="card-head"><span class="card-index">${item.kind}</span><span class="tag tag-${item.status}">${item.status.toUpperCase()}</span></div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <div class="game-line">${item.games}</div>
      </article>`).join('');
    empty.hidden = matches.length !== 0;
  }

  search.addEventListener('input', renderCatalog);
  status.addEventListener('change', renderCatalog);
  renderCatalog();
}

const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('#site-nav');
if (menu && nav) {
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (event) => {
    if (event.target.matches('a')) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }
  });
}
