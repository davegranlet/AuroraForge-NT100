(function () {
  'use strict';

  var article = document.getElementById('handbook-article');
  var search = document.getElementById('handbook-search');
  var status = document.getElementById('handbook-search-status');
  var smaller = document.getElementById('handbook-font-smaller');
  var larger = document.getElementById('handbook-font-larger');
  var backTop = document.getElementById('handbook-back-top');
  var storageKey = 'auroraForgeHandbookFontScale';
  var scale = Number(localStorage.getItem(storageKey) || '1');

  function applyScale() {
    scale = Math.max(0.85, Math.min(1.35, scale));
    article.style.setProperty('--handbook-font-scale', String(scale));
    localStorage.setItem(storageKey, String(scale));
  }

  function clearSearchMarks() {
    article.querySelectorAll('mark.handbook-search-mark').forEach(function (mark) {
      mark.replaceWith(document.createTextNode(mark.textContent));
    });
    article.normalize();
  }

  function markText(node, query) {
    if (node.nodeType === Node.TEXT_NODE) {
      var text = node.nodeValue;
      var lower = text.toLowerCase();
      var at = lower.indexOf(query);
      if (at < 0) return 0;
      var fragment = document.createDocumentFragment();
      var count = 0;
      var cursor = 0;
      while (at >= 0) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, at)));
        var mark = document.createElement('mark');
        mark.className = 'handbook-search-mark';
        mark.textContent = text.slice(at, at + query.length);
        fragment.appendChild(mark);
        count += 1;
        cursor = at + query.length;
        at = lower.indexOf(query, cursor);
      }
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
      node.replaceWith(fragment);
      return count;
    }
    if (
      node.nodeType !== Node.ELEMENT_NODE ||
      node.matches('script, style, mark') ||
      node.closest('pre, code')
    ) {
      return 0;
    }
    var total = 0;
    Array.from(node.childNodes).forEach(function (child) {
      total += markText(child, query);
    });
    return total;
  }

  function runSearch() {
    clearSearchMarks();
    var query = search.value.trim().toLowerCase();
    if (!query) {
      status.textContent = 'All sections shown';
      return;
    }
    var count = markText(article, query);
    status.textContent = count === 1 ? '1 match found' : count + ' matches found';
    var first = article.querySelector('mark.handbook-search-mark');
    if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderEvidenceAppendix(library) {
    if (!article || !library || !Array.isArray(library.coverage)) return;
    var subjects = {};
    var sources = {};
    (library.subjects || []).forEach(function (item) { subjects[item.id] = item; });
    (library.sources || []).forEach(function (item) { sources[item.id] = item; });

    var coverageRows = library.coverage.map(function (item) {
      var subject = subjects[item.subjectId] || { name: item.subjectId };
      return '<tr><td>' + escapeHtml(subject.name) + '</td><td><strong>' + escapeHtml(item.status) + '</strong></td><td>' +
        escapeHtml((item.gaps || []).join(' ')) + '</td></tr>';
    }).join('');

    var factRows = (library.facts || []).map(function (fact) {
      var refs = (fact.sourceRefs || []).map(function (ref) {
        var source = sources[ref.sourceId] || { title: ref.sourceId };
        var locators = [];
        if (ref.timestamp) locators.push('procedure ' + ref.timestamp);
        if (ref.outcomeTimestamp) locators.push('outcome ' + ref.outcomeTimestamp);
        if (ref.locator) locators.push(ref.locator);
        var locator = locators.join('; ');
        if (source.url) {
          return '<a href="' + escapeHtml(source.url) + '" target="_blank" rel="noreferrer">' + escapeHtml(source.title) + '</a>' +
            (locator ? ' (' + escapeHtml(locator) + ')' : '');
        }
        return escapeHtml(source.title) + (locator ? ' (' + escapeHtml(locator) + ')' : '');
      }).join('; ');
      return '<details class="handbook-evidence-record"><summary><span>' + escapeHtml(fact.evidenceLabel) + '</span><strong>' + escapeHtml(fact.fact) + '</strong></summary>' +
        '<p><b>Version scope:</b> ' + escapeHtml((fact.gameVersions || []).join(', ')) + '</p>' +
        '<p><b>Sources:</b> ' + refs + '</p>' +
        '<p><b>Limits:</b> ' + escapeHtml((fact.limitations || []).join(' ')) + '</p></details>';
    }).join('');

    var section = document.createElement('section');
    section.id = 'appendix-f-evidence-coverage';
    section.className = 'handbook-evidence-appendix';
    section.innerHTML = '<h1>Appendix F - Evidence and Coverage</h1>' +
      '<aside class="handbook-callout note">This live appendix is generated from the packaged evidence database reviewed ' + escapeHtml(library.reviewed) + '. A video proves only the version, tools, files, actions, and visible outcome shown. Missing details remain missing.</aside>' +
      '<div class="handbook-table-wrap"><table><thead><tr><th>Subject</th><th>Coverage</th><th>Remaining gap</th></tr></thead><tbody>' + coverageRows + '</tbody></table></div>' +
      '<h2>Evidence records</h2>' + factRows +
      '<h2>Known unknowns</h2><ul>' + (library.unknowns || []).map(function (item) { return '<li>' + escapeHtml(item) + '</li>'; }).join('') + '</ul>';
    article.appendChild(section);

    var toc = document.querySelector('.handbook-toc');
    if (toc) {
      var link = document.createElement('a');
      link.className = 'handbook-toc-level-1';
      link.href = '#appendix-f-evidence-coverage';
      link.textContent = 'Appendix F - Evidence and Coverage';
      toc.appendChild(link);
    }
  }

  if (search) {
    var searchTimer;
    search.addEventListener('input', function () {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(runSearch, 180);
    });
  }
  if (smaller) {
    smaller.addEventListener('click', function () {
      scale -= 0.1;
      applyScale();
    });
  }
  if (larger) {
    larger.addEventListener('click', function () {
      scale += 0.1;
      applyScale();
    });
  }
  if (backTop) {
    backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  applyScale();

  fetch('data/wwe2k26-modding-facts.json', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('Evidence library returned ' + response.status);
      return response.json();
    })
    .then(renderEvidenceAppendix)
    .catch(function () {
      var warning = document.createElement('aside');
      warning.className = 'handbook-callout warning';
      warning.textContent = 'The evidence appendix could not be loaded. Treat version-specific procedures as unverified until the packaged data file is available.';
      article.appendChild(warning);
    });
})();
