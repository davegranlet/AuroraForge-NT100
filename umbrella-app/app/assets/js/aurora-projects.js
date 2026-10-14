'use strict';

const catalogNode = document.getElementById('projectCatalog');
const searchNode = document.getElementById('projectSearch');
const pillarNode = document.getElementById('projectPillar');
const statusNode = document.getElementById('projectStatus');
const countNode = document.getElementById('projectResultCount');
const badgeNode = document.getElementById('projectCountBadge');
const converterButton = document.getElementById('openAnimationConverter');
const converterStatus = document.getElementById('animationConverterStatus');
let projects = [];

function appendText(parent, tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  parent.appendChild(node);
  return node;
}

function addOptions(select, values) {
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
}

function projectHaystack(project) {
  return [project.title, project.kind, project.pillar, project.status, project.description, ...(project.games || [])]
    .join(' ')
    .toLowerCase();
}

function makeCard(project) {
  const article = document.createElement('article');
  article.className = `project-card${project.featured ? ' project-card-featured' : ''}`;
  article.dataset.projectId = project.id;

  const top = document.createElement('div');
  top.className = 'project-card-top';
  appendText(top, 'span', 'project-kind', project.kind);
  appendText(top, 'span', `project-status project-status-${project.status}`, project.status);
  article.appendChild(top);

  appendText(article, 'h2', '', project.title);
  appendText(article, 'p', '', project.description);

  const meta = document.createElement('div');
  meta.className = 'project-meta';
  appendText(meta, 'span', '', project.pillar);
  if (project.games?.length) appendText(meta, 'span', '', project.games.join(' / '));
  article.appendChild(meta);

  const path = appendText(article, 'code', 'project-path', project.workspaceRelativePath);
  path.title = 'Workspace-relative repository path';

  const actions = document.createElement('div');
  actions.className = 'ai-actions project-actions';
  if (project.integratedPage) {
    const open = document.createElement('a');
    open.className = 'ai-btn';
    open.href = project.integratedPage;
    open.textContent = 'Open integrated tool';
    actions.appendChild(open);
  }
  const source = document.createElement('a');
  source.className = project.integratedPage ? 'ai-btn secondary' : 'ai-btn';
  source.href = project.repository;
  source.target = '_blank';
  source.rel = 'noreferrer';
  source.textContent = 'Repository';
  actions.appendChild(source);
  article.appendChild(actions);
  return article;
}

function render() {
  const query = searchNode.value.trim().toLowerCase();
  const pillar = pillarNode.value;
  const status = statusNode.value;
  const visible = projects.filter((project) =>
    (!query || projectHaystack(project).includes(query)) &&
    (!pillar || project.pillar === pillar) &&
    (!status || project.status === status)
  );
  catalogNode.replaceChildren(...visible.map(makeCard));
  countNode.textContent = `${visible.length} of ${projects.length} projects shown`;
}

async function loadCatalog() {
  try {
    const response = await fetch('data/aurora-projects.json');
    if (!response.ok) throw new Error(`catalog request failed (${response.status})`);
    const catalog = await response.json();
    projects = catalog.projects || [];
    badgeNode.textContent = `${projects.length} repositories`;
    addOptions(pillarNode, [...new Set(projects.map((project) => project.pillar))].sort());
    addOptions(statusNode, [...new Set(projects.map((project) => project.status))].sort());
    render();
  } catch (error) {
    countNode.textContent = `Project catalog unavailable: ${error.message}`;
  }
}

searchNode.addEventListener('input', render);
pillarNode.addEventListener('change', render);
statusNode.addEventListener('change', render);
converterButton.addEventListener('click', async () => {
  converterButton.disabled = true;
  converterStatus.textContent = 'Launching AuroraForge NT100 Beta3 converter...';
  try {
    const result = await window.WWE2K26Desktop.openAnimationConverter();
    converterStatus.textContent = result.ok ? 'Converter launched.' : (result.error || 'Converter did not launch.');
  } catch (error) {
    converterStatus.textContent = error.message;
  } finally {
    converterButton.disabled = false;
  }
});
loadCatalog();
