/*
  Russian Orthodox Church and Skete of the Resurrection of Christ
  Site behaviour: mobile menu, English/Russian toggle, and the data-driven
  schedule, photo gallery, bulletin archive and readings index.
*/

(function () {
  'use strict';

  /* ---------------- Mobile menu ---------------- */

  var menuBtn = document.getElementById('menuBtn');
  var mainNav = document.getElementById('mainNav');

  if (menuBtn && mainNav) {
    menuBtn.addEventListener('click', function () {
      var open = mainNav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    mainNav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        mainNav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------------- Language ---------------- */

  var STORE_KEY = 'roc-lang';
  var langEn = document.getElementById('langEn');
  var langRu = document.getElementById('langRu');

  function readStoredLang() {
    try { return window.localStorage.getItem(STORE_KEY); } catch (e) { return null; }
  }
  function storeLang(lang) {
    try { window.localStorage.setItem(STORE_KEY, lang); } catch (e) { /* private mode */ }
  }

  var currentLang = readStoredLang() === 'ru' ? 'ru' : 'en';

  function applyLang(lang) {
    currentLang = lang === 'ru' ? 'ru' : 'en';
    var nodes = document.querySelectorAll('[data-en]');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var text = currentLang === 'ru' ? node.getAttribute('data-ru') : node.getAttribute('data-en');
      if (text) { node.innerHTML = text; }
    }

    /* Whole articles are too long to carry in data-en/data-ru attributes, so a
       reading keeps one block per language and we show the matching one. */
    var blocks = document.querySelectorAll('[data-lang-block]');
    for (var b = 0; b < blocks.length; b++) {
      blocks[b].hidden = blocks[b].getAttribute('data-lang-block') !== currentLang;
    }

    document.documentElement.setAttribute('lang', currentLang);
    if (langEn) { langEn.classList.toggle('active', currentLang === 'en'); }
    if (langRu) { langRu.classList.toggle('active', currentLang === 'ru'); }
    storeLang(currentLang);
    document.dispatchEvent(new CustomEvent('langchange', { detail: currentLang }));
  }

  if (langEn) { langEn.addEventListener('click', function () { applyLang('en'); }); }
  if (langRu) { langRu.addEventListener('click', function () { applyLang('ru'); }); }

  applyLang(currentLang);

  function t(en, ru) { return currentLang === 'ru' ? ru : en; }

  function getJSON(path) {
    return fetch(path, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) { throw new Error(path + ' returned ' + r.status); }
      return r.json();
    });
  }

  /* ---------------- Upcoming services ---------------- */

  var eventList = document.getElementById('eventList');

  function renderEvents(events) {
    if (!eventList) { return; }
    var limit = parseInt(eventList.getAttribute('data-limit') || '0', 10);
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var upcoming = events.filter(function (ev) {
      var end = ev.endDate || ev.date;
      return !end || new Date(end + 'T23:59:59') >= today;
    });
    if (limit > 0) { upcoming = upcoming.slice(0, limit); }

    if (upcoming.length === 0) {
      eventList.innerHTML = '<li><span class="event-desc empty-note">' +
        t('The next schedule has not been published yet. Please see the latest bulletin, or call the church.',
          'Новое расписание пока не опубликовано. Пожалуйста, смотрите последний церковный листок или позвоните в храм.') +
        '</span></li>';
      return;
    }

    eventList.innerHTML = upcoming.map(function (ev) {
      var label = currentLang === 'ru' && ev.dateLabelRu ? ev.dateLabelRu : (ev.dateLabel || formatDate(ev.date));
      var desc = currentLang === 'ru' && ev.titleRu ? ev.titleRu : ev.title;
      var feast = currentLang === 'ru' ? ev.feastRu : ev.feast;
      return '<li><span class="event-date">' + escapeHTML(label) + '</span>' +
             '<span class="event-desc">' + escapeHTML(desc || '') +
             (feast ? '<span class="event-feast">' + escapeHTML(feast) + '</span>' : '') +
             '</span></li>';
    }).join('');
  }

  function formatDate(iso) {
    if (!iso) { return ''; }
    var d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) { return iso; }
    return d.toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US',
      { weekday: 'short', month: 'short', day: 'numeric' });
  }

  var eventsCache = null;
  if (eventList) {
    getJSON('data/events.json')
      .then(function (data) { eventsCache = data; renderEvents(data); })
      .catch(function () {
        eventList.innerHTML = '<li><span class="event-desc empty-note">' +
          t('The schedule could not be loaded. Please see the latest bulletin.',
            'Не удалось загрузить расписание. Пожалуйста, смотрите последний церковный листок.') + '</span></li>';
      });
    document.addEventListener('langchange', function () {
      if (eventsCache) { renderEvents(eventsCache); }
    });
  }

  /* ---------------- Photo gallery ---------------- */

  var albumGrid = document.getElementById('albumGrid');
  var photoGrid = document.getElementById('photoGrid');
  var homeAlbums = document.getElementById('homeAlbums');
  var galleryToolbar = document.getElementById('galleryToolbar');
  var galleryHeading = document.getElementById('galleryHeading');
  var galleryBack = document.getElementById('galleryBack');

  var albums = [];
  var openAlbum = null;

  function photoCount(album) {
    return album && album.photos ? album.photos.length : 0;
  }

  /* "фото" does not inflect after a numeral, so only English needs a plural. */
  function countLabel(n) {
    return n + ' ' + (currentLang === 'ru' ? 'фото' : (n === 1 ? 'photograph' : 'photographs'));
  }

  function albumMetaHTML(album) {
    return '<span class="album-meta">' +
      '<span class="album-title">' + escapeHTML(album.title) + '</span>' +
      '<span class="album-count">' + escapeHTML(countLabel(photoCount(album))) + '</span>' +
      '</span>';
  }

  function albumCardHTML(album, index) {
    return '<button class="album-card" data-album="' + index + '">' +
      '<img class="album-cover" src="' + escapeHTML(album.cover) + '" alt="" loading="lazy">' +
      albumMetaHTML(album) + '</button>';
  }

  function renderAlbums() {
    if (!albumGrid) { return; }
    albumGrid.innerHTML = albums.map(albumCardHTML).join('');
  }

  function renderHomeAlbums() {
    if (!homeAlbums) { return; }
    homeAlbums.innerHTML = albums.slice(0, 3).map(function (album) {
      return '<a class="album-card" href="gallery.html">' +
        '<img class="album-cover" src="' + escapeHTML(album.cover) + '" alt="" loading="lazy">' +
        albumMetaHTML(album) + '</a>';
    }).join('');
  }

  function showAlbum(index) {
    openAlbum = index;
    var album = albums[index];
    if (!album || !photoGrid) { return; }

    photoGrid.innerHTML = album.photos.map(function (p, i) {
      return '<button data-photo="' + i + '" aria-label="' +
        escapeHTML(album.title + ' — ' + (i + 1)) + '">' +
        '<img src="' + escapeHTML(p.thumb) + '" alt="' + escapeHTML(p.caption || '') + '" loading="lazy">' +
        '</button>';
    }).join('');

    albumGrid.hidden = true;
    photoGrid.hidden = false;
    if (galleryToolbar) { galleryToolbar.hidden = false; }
    if (galleryHeading) { galleryHeading.textContent = album.title; }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showAllAlbums() {
    openAlbum = null;
    if (photoGrid) { photoGrid.hidden = true; }
    if (albumGrid) { albumGrid.hidden = false; }
    if (galleryToolbar) { galleryToolbar.hidden = true; }
  }

  if (albumGrid) {
    albumGrid.addEventListener('click', function (e) {
      var card = e.target.closest('[data-album]');
      if (card) { showAlbum(parseInt(card.getAttribute('data-album'), 10)); }
    });
  }
  if (galleryBack) { galleryBack.addEventListener('click', showAllAlbums); }

  if (albumGrid || homeAlbums) {
    getJSON('data/gallery.json').then(function (data) {
      albums = data;
      renderAlbums();
      renderHomeAlbums();
    }).catch(function () {
      if (albumGrid) {
        albumGrid.innerHTML = '<p class="empty-note">' +
          t('The gallery could not be loaded.', 'Не удалось загрузить галерею.') + '</p>';
      }
    });
    /* Redraw both grids so the photo counts follow the language. Rewriting the
       album grid is safe while an album is open: `hidden` sits on the container. */
    document.addEventListener('langchange', function () {
      if (!albums.length) { return; }
      renderAlbums();
      renderHomeAlbums();
    });
  }

  /* ---------------- Lightbox ---------------- */

  var lightbox = document.getElementById('lightbox');
  var lbImage = document.getElementById('lbImage');
  var lbCaption = document.getElementById('lbCaption');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');

  /* The lightbox shows whichever set was handed to it: an album's photographs
     on the gallery page, or the pictures standing in the page elsewhere. */
  var lbPhotos = [];
  var lbTitle = '';
  var lbIndex = 0;
  var lbReturnFocus = null;

  function showPhoto(i) {
    if (!lightbox || !lbPhotos.length) { return; }
    lbIndex = (i + lbPhotos.length) % lbPhotos.length;
    var p = lbPhotos[lbIndex];
    var many = lbPhotos.length > 1;

    lbImage.src = p.large || p.thumb;
    lbImage.alt = p.caption || '';

    var parts = [];
    if (lbTitle) { parts.push(lbTitle); }
    if (p.caption) { parts.push(p.caption); }
    if (many) { parts.push((lbIndex + 1) + ' / ' + lbPhotos.length); }
    lbCaption.textContent = parts.join(' · ');

    if (lbPrev) { lbPrev.hidden = !many; }
    if (lbNext) { lbNext.hidden = !many; }

    lightbox.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function openLightbox(photos, title, i, trigger) {
    if (!lightbox || !photos || !photos.length) { return; }
    lbPhotos = photos;
    lbTitle = title || '';
    lbReturnFocus = trigger || null;
    showPhoto(i || 0);
    if (lbClose) { lbClose.focus(); }
  }

  function closeLightbox() {
    if (!lightbox) { return; }
    lightbox.classList.remove('open');
    lbImage.src = '';
    document.body.style.overflow = '';
    if (lbReturnFocus) { lbReturnFocus.focus(); lbReturnFocus = null; }
  }

  if (photoGrid) {
    photoGrid.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-photo]');
      if (!btn || openAlbum === null || !albums[openAlbum]) { return; }
      var album = albums[openAlbum];
      openLightbox(album.photos, album.title, parseInt(btn.getAttribute('data-photo'), 10), btn);
    });
  }

  if (lightbox) {
    if (lbClose) { lbClose.addEventListener('click', closeLightbox); }
    if (lbPrev) { lbPrev.addEventListener('click', function () { showPhoto(lbIndex - 1); }); }
    if (lbNext) { lbNext.addEventListener('click', function () { showPhoto(lbIndex + 1); }); }
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) { closeLightbox(); }
    });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('open')) { return; }
      if (e.key === 'Escape') { closeLightbox(); }
      if (e.key === 'ArrowLeft') { showPhoto(lbIndex - 1); }
      if (e.key === 'ArrowRight') { showPhoto(lbIndex + 1); }
    });
  }

  /* ---------------- Pictures in the page (data-zoom) ---------------- */

  /* Any image marked data-zoom becomes a button that opens the lightbox, so a
     visitor can see a face properly instead of the card's crop. The set is
     shared, which gives the arrows something to move through. */
  var zoomTriggers = [];

  function zoomLabel(caption) {
    var enlarge = t('click to enlarge', 'нажмите, чтобы увеличить');
    return caption ? caption + ' — ' + enlarge : t('Enlarge photograph', 'Увеличить фотографию');
  }

  function makeZoomable(img, index, set) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'zoom-btn';
    btn.setAttribute('aria-label', zoomLabel(set[index].caption));
    img.parentNode.insertBefore(btn, img);
    btn.appendChild(img);
    btn.addEventListener('click', function () { openLightbox(set, '', index, btn); });
    zoomTriggers.push({ btn: btn, caption: set[index].caption });
  }

  if (lightbox) {
    var zoomImages = document.querySelectorAll('img[data-zoom]');
    var zoomSet = [];
    var zi;
    for (zi = 0; zi < zoomImages.length; zi++) {
      zoomSet.push({
        large: zoomImages[zi].getAttribute('data-zoom-src') || zoomImages[zi].getAttribute('src'),
        thumb: zoomImages[zi].getAttribute('src'),
        caption: zoomImages[zi].getAttribute('data-zoom-caption') || zoomImages[zi].getAttribute('alt') || ''
      });
    }
    for (zi = 0; zi < zoomImages.length; zi++) {
      makeZoomable(zoomImages[zi], zi, zoomSet);
    }
    if (zoomTriggers.length) {
      document.addEventListener('langchange', function () {
        for (var i = 0; i < zoomTriggers.length; i++) {
          zoomTriggers[i].btn.setAttribute('aria-label', zoomLabel(zoomTriggers[i].caption));
        }
      });
    }
  }

  /* ---------------- Bulletins ---------------- */

  var bulletinList = document.getElementById('bulletinList');
  var yearFilter = document.getElementById('yearFilter');
  var bulletins = [];
  var activeYear = 'all';

  function renderBulletins() {
    if (!bulletinList) { return; }
    var rows = activeYear === 'all'
      ? bulletins
      : bulletins.filter(function (b) { return String(b.year) === String(activeYear); });

    if (!rows.length) {
      bulletinList.innerHTML = '<li><span class="empty-note">' +
        t('No bulletins for this year.', 'За этот год листков нет.') + '</span></li>';
      return;
    }

    bulletinList.innerHTML = rows.map(function (b) {
      var href = b.local
        ? 'files/bulletins/' + encodeURIComponent(b.file)
        : 'https://resurrectionskete.org' + (b.src || ('/files/bulletins/' + b.file));
      return '<li><span class="bul-date">' + escapeHTML(b.label || b.date || '') + '</span>' +
        '<a class="bul-link" href="' + escapeHTML(href) + '" target="_blank" rel="noopener">' +
        t('Open PDF', 'Открыть PDF') + '</a></li>';
    }).join('');
  }

  function renderYearFilter() {
    if (!yearFilter) { return; }
    var years = [];
    bulletins.forEach(function (b) {
      if (b.year && years.indexOf(String(b.year)) === -1) { years.push(String(b.year)); }
    });
    years.sort(function (a, b) { return Number(b) - Number(a); });

    yearFilter.innerHTML = ['<button data-year="all" class="' + (activeYear === 'all' ? 'active' : '') + '">' +
      t('All years', 'Все годы') + '</button>']
      .concat(years.map(function (y) {
        return '<button data-year="' + y + '" class="' + (activeYear === y ? 'active' : '') + '">' + y + '</button>';
      })).join('');
  }

  if (bulletinList) {
    getJSON('data/bulletins.json').then(function (data) {
      bulletins = data.sort(function (a, b) {
        if (a.date && b.date) { return a.date < b.date ? 1 : -1; }
        return (Number(b.year) || 0) - (Number(a.year) || 0);
      });
      renderYearFilter();
      renderBulletins();
    }).catch(function () {
      bulletinList.innerHTML = '<li><span class="empty-note">' +
        t('The bulletin archive could not be loaded.', 'Не удалось загрузить архив листков.') + '</span></li>';
    });

    if (yearFilter) {
      yearFilter.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-year]');
        if (!btn) { return; }
        activeYear = btn.getAttribute('data-year');
        renderYearFilter();
        renderBulletins();
      });
    }
    document.addEventListener('langchange', function () {
      if (bulletins.length) { renderYearFilter(); renderBulletins(); }
    });
  }

  /* ---------------- Readings index ---------------- */

  var readingList = document.getElementById('readingList');
  var readingSearch = document.getElementById('readingSearch');
  var readingCount = document.getElementById('readingCount');
  var readings = [];

  /* Every reading is on the site in both languages, so the list shows the
     title in whichever language is being read and searches across both. */
  function readingTitle(r) {
    return (currentLang === 'ru' ? r.ru : r.en) || r.en || r.ru || r.slug;
  }

  function readingSource(r) {
    return (currentLang === 'ru' ? r.srcRu : r.srcEn) || '';
  }

  function readingMatches(r, needle) {
    if (!needle) { return true; }
    var hay = [r.en, r.ru, r.srcEn, r.srcRu].join(' ').toLowerCase();
    return hay.indexOf(needle) !== -1;
  }

  function renderReadings() {
    if (!readingList) { return; }
    var needle = readingSearch ? readingSearch.value.trim().toLowerCase() : '';
    var rows = readings.filter(function (r) { return readingMatches(r, needle); });
    /* Alphabetical by the title actually on screen, so the order still makes
       sense to a reader who has switched to Russian. */
    rows.sort(function (a, b) {
      return readingTitle(a).localeCompare(readingTitle(b), currentLang === 'ru' ? 'ru' : 'en');
    });

    if (!rows.length) {
      readingList.innerHTML = '<li><span class="empty-note">' +
        t('No reading matches that search.', 'Ничего не найдено.') + '</span></li>';
    } else {
      readingList.innerHTML = rows.map(function (r) {
        var source = readingSource(r);
        return '<li><a href="' + escapeHTML(r.href) + '">' + escapeHTML(readingTitle(r)) + '</a>' +
          (source ? '<span class="reading-source">' + escapeHTML(source) + '</span>' : '') +
          '</li>';
      }).join('');
    }

    if (readingCount) {
      readingCount.textContent = needle
        ? rows.length + ' ' + t('of', 'из') + ' ' + readings.length
        : readings.length + ' ' + t('readings', 'чтений');
    }
  }

  if (readingList) {
    getJSON('data/readings.json').then(function (data) {
      readings = data;
      renderReadings();
    }).catch(function () {
      readingList.innerHTML = '<li><span class="empty-note">' +
        t('The readings could not be loaded.', 'Не удалось загрузить чтения.') + '</span></li>';
    });

    if (readingSearch) {
      readingSearch.addEventListener('input', renderReadings);
    }
    document.addEventListener('langchange', function () {
      if (readings.length) { renderReadings(); }
    });
  }

  /* ---------------- Helper ---------------- */

  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
