(function () {
  'use strict';

  var guides = Array.isArray(window.AURORA_EASY_GUIDES) ? window.AURORA_EASY_GUIDES : [];
  var guideList = document.getElementById('easy-guide-list');
  var groupList = document.getElementById('easy-guide-groups');
  var search = document.getElementById('easy-guide-search');
  var count = document.getElementById('easy-guide-count');
  var video = document.getElementById('easy-guide-video');
  var videoTitle = document.getElementById('easy-guide-video-title');
  var activeGroup = 'All';
  var evidenceLibrary = null;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function list(items) {
    return '<ol>' + items.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('') + '</ol>';
  }

  function bulletList(items) {
    return '<ul>' + items.map(function (item) {
      return '<li>' + escapeHtml(item) + '</li>';
    }).join('') + '</ul>';
  }

  function safeUrl(value) {
    try {
      var parsed = new URL(String(value));
      return parsed.protocol === 'https:' ? parsed.href : '';
    } catch (error) {
      return '';
    }
  }

  function sourceList(items) {
    if (!Array.isArray(items) || !items.length) return '';
    var links = items.map(function (item) {
      var href = safeUrl(item.url);
      if (!href) return '';
      return '<li><a href="' + escapeHtml(href) + '" target="_blank" rel="noreferrer">' + escapeHtml(item.label) + '</a></li>';
    }).filter(Boolean);
    if (!links.length) return '';
    return '<div class="easy-guide-box sources"><h3>Sources and videos</h3><ul>' + links.join('') + '</ul></div>';
  }

  function evidenceForGuide(guideId) {
    if (!evidenceLibrary || !Array.isArray(evidenceLibrary.facts)) return [];
    return evidenceLibrary.facts.filter(function (fact) {
      return Array.isArray(fact.relatedTutorialIds) && fact.relatedTutorialIds.indexOf(guideId) !== -1;
    });
  }

  function evidenceBox(guideId) {
    var facts = evidenceForGuide(guideId);
    if (!facts.length) {
      return '<div class="easy-guide-box evidence pending"><h3>Evidence status</h3><p>No formal evidence record is mapped to this lesson yet. Treat game- or tool-specific details as unverified.</p></div>';
    }
    var rows = facts.map(function (fact) {
      var versions = Array.isArray(fact.gameVersions) ? fact.gameVersions.join(', ') : 'Version not recorded';
      var limits = Array.isArray(fact.limitations) ? fact.limitations.join(' ') : '';
      var sourceIndex = {};
      (evidenceLibrary.sources || []).forEach(function (source) { sourceIndex[source.id] = source; });
      var refs = (fact.sourceRefs || []).map(function (ref) {
        var source = sourceIndex[ref.sourceId] || { title: ref.sourceId };
        var href = safeUrl(source.url);
        var labels = [];
        if (ref.timestamp) labels.push('procedure ' + ref.timestamp);
        if (ref.outcomeTimestamp) labels.push('outcome ' + ref.outcomeTimestamp);
        if (ref.locator) labels.push(ref.locator);
        var title = href ? '<a href="' + escapeHtml(href) + '" target="_blank" rel="noreferrer">' + escapeHtml(source.title) + '</a>' : escapeHtml(source.title);
        return title + (labels.length ? ' (' + escapeHtml(labels.join('; ')) + ')' : '');
      }).join('; ');
      return '<li><div class="evidence-badges"><span>' + escapeHtml(fact.evidenceLabel) + '</span><span>' + escapeHtml(versions) + '</span></div>' +
        '<strong>' + escapeHtml(fact.fact) + '</strong>' +
        (refs ? '<small><b>Evidence:</b> ' + refs + '</small>' : '') +
        (limits ? '<small><b>Limit:</b> ' + escapeHtml(limits) + '</small>' : '') +
      '</li>';
    });
    return '<div class="easy-guide-box evidence"><h3>Evidence and version scope</h3><ul>' + rows.join('') + '</ul></div>';
  }

  function mediaVideo(value) {
    var source = String(value || '');
    if (/^[a-z0-9_-]+$/i.test(source)) {
      return 'training/animated-tutorial-clips/' + source + '.mp4';
    }
    if (/^training\/community-reference\/[a-z0-9_.-]+\.mp4$/i.test(source)) {
      return source;
    }
    return '';
  }

  function visualCard(item) {
    if (!item || !/^training\/community-reference\/[a-z0-9_.-]+\.(?:png|jpe?g|webp)$/i.test(String(item.src || ''))) {
      return '';
    }
    return '<figure class="easy-guide-visual">' +
      '<img src="' + escapeHtml(item.src) + '" alt="' + escapeHtml(item.alt || '') + '">' +
      (item.caption ? '<figcaption>' + escapeHtml(item.caption) + '</figcaption>' : '') +
    '</figure>';
  }

  function playVideo(id, title) {
    var source = mediaVideo(id);
    if (!video || !source) return;
    video.src = source;
    videoTitle.textContent = title;
    video.load();
    video.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function wireVideoLibrary() {
    document.querySelectorAll('.tutorial-video-choice').forEach(function (button) {
      button.addEventListener('click', function () {
        document.querySelectorAll('.tutorial-video-choice').forEach(function (item) {
          item.classList.toggle('active', item === button);
        });
        playVideo(button.dataset.video, button.dataset.title);
      });
    });
  }

  function card(guide, index) {
    var videoButton = guide.video
      ? '<button class="ai-btn secondary easy-video-button" type="button" data-video="' + escapeHtml(guide.video) + '" data-title="' + escapeHtml(guide.title) + '">Watch the short video</button>'
      : '';
    return '<details class="easy-guide-card" id="' + escapeHtml(guide.id) + '"' + (index === 0 ? ' open' : '') + '>' +
      '<summary><span class="easy-guide-number">' + String(index + 1).padStart(2, '0') + '</span><span><strong>' + escapeHtml(guide.title) + '</strong><small>' + escapeHtml(guide.summary) + '</small></span></summary>' +
      '<div class="easy-guide-body">' +
        videoButton +
        '<div class="easy-guide-box ready"><h3>Get ready</h3>' + bulletList(guide.need) + '</div>' +
        '<div class="easy-guide-box steps"><h3>Do this</h3>' + list(guide.steps) + '</div>' +
        '<div class="easy-guide-box good"><h3>You should see</h3>' + bulletList(guide.good) + '</div>' +
        '<div class="easy-guide-box stop"><h3>Stop and check</h3>' + bulletList(guide.stop) + '</div>' +
        evidenceBox(guide.id) +
        visualCard(guide.visual) +
        sourceList(guide.sources) +
      '</div>' +
    '</details>';
  }

  function render() {
    var term = String(search ? search.value : '').trim().toLowerCase();
    var visible = guides.filter(function (guide) {
      var groupMatch = activeGroup === 'All' || guide.group === activeGroup;
      var text = [guide.title, guide.summary, guide.group]
        .concat(guide.need, guide.steps, guide.good, guide.stop, guide.visual ? [guide.visual.caption, guide.visual.alt] : [], (guide.sources || []).map(function (item) { return item.label; }))
        .join(' ')
        .toLowerCase();
      return groupMatch && (!term || text.indexOf(term) !== -1);
    });

    guideList.innerHTML = visible.length
      ? visible.map(card).join('')
      : '<div class="ai-panel app-panel"><h2>No lesson found</h2><p>Try a shorter word, such as face, mask, music, arena, or CakeView.</p></div>';
    count.textContent = visible.length + (visible.length === 1 ? ' lesson' : ' lessons');

    guideList.querySelectorAll('.easy-video-button').forEach(function (button) {
      button.addEventListener('click', function () {
        playVideo(button.dataset.video, button.dataset.title);
      });
    });
    openHashLesson();
  }

  function openHashLesson() {
    var id = String(window.location.hash || '').replace(/^#/, '');
    if (!id) return;
    var lesson = document.getElementById(id);
    if (!lesson || !lesson.matches('.easy-guide-card')) return;
    lesson.open = true;
    window.setTimeout(function () {
      lesson.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  }

  function buildGroups() {
    var groups = ['All'];
    guides.forEach(function (guide) {
      if (groups.indexOf(guide.group) === -1) groups.push(guide.group);
    });
    groupList.innerHTML = groups.map(function (group) {
      return '<button type="button" data-group="' + escapeHtml(group) + '"' + (group === 'All' ? ' class="active"' : '') + '>' + escapeHtml(group) + '</button>';
    }).join('');
    groupList.querySelectorAll('button').forEach(function (button) {
      button.addEventListener('click', function () {
        activeGroup = button.dataset.group;
        groupList.querySelectorAll('button').forEach(function (item) {
          item.classList.toggle('active', item === button);
        });
        render();
      });
    });
  }

  if (!guideList || !groupList || !search || !count) return;
  buildGroups();
  wireVideoLibrary();
  search.addEventListener('input', render);
  window.addEventListener('hashchange', openHashLesson);
  document.getElementById('easy-guide-expand').addEventListener('click', function () {
    guideList.querySelectorAll('details').forEach(function (item) { item.open = true; });
  });
  document.getElementById('easy-guide-collapse').addEventListener('click', function () {
    guideList.querySelectorAll('details').forEach(function (item) { item.open = false; });
  });
  render();

  fetch('data/wwe2k26-modding-facts.json', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('Evidence library returned ' + response.status);
      return response.json();
    })
    .then(function (library) {
      evidenceLibrary = library;
      render();
    })
    .catch(function () {
      evidenceLibrary = null;
      render();
    });
})();
