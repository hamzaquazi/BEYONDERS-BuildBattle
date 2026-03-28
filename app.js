// ===== ROUTER STATE =====
let currentPage = 'home';
let currentPlatformId = null;
let currentEventId = null;

// ===== BOOKMARK STORE =====
const BOOKMARK_KEY = 'es_bookmarks';
const Bookmarks = {
  _ids() {
    try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY)) || []; }
    catch { return []; }
  },
  has(id)    { return this._ids().includes(id); },
  toggle(id) {
    const ids = this._ids();
    const next = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
    return next.includes(id); // true = now bookmarked
  },
  all()      { return this._ids(); },
};

// ===== NAVIGATION =====
function navigate(page, opts = {}) {
  // Always kill any running countdown first
  if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }

  currentPage = page;
  if (opts.platformId) currentPlatformId = opts.platformId;
  if (opts.eventId)   currentEventId   = opts.eventId;

  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderPage();
  updateNavActive();
}

function updateNavActive() {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  if (currentPage === 'home') {
    document.getElementById('nav-link-home')?.classList.add('active');
  } else if (currentPage === 'dashboard') {
    document.getElementById('nav-link-dashboard')?.classList.add('active');
  }
}

function renderPage() {
  const app = document.getElementById('app');
  switch (currentPage) {
    case 'home':      app.innerHTML = renderHome(); break;
    case 'platform':  app.innerHTML = renderPlatformPage(); break;
    case 'event':     app.innerHTML = renderEventDetail(); break;
    case 'register':  app.innerHTML = renderRegisterPage(); break;
    case 'dashboard': app.innerHTML = renderDashboard(); break;
    default:          app.innerHTML = renderHome();
  }
  attachPageEvents();
}

// ===== NAVBAR EVENTS =====
document.getElementById('nav-home-link').addEventListener('click', e => { e.preventDefault(); navigate('home'); });
document.getElementById('nav-link-home').addEventListener('click', e => { e.preventDefault(); navigate('home'); });
document.getElementById('nav-link-dashboard').addEventListener('click', e => { e.preventDefault(); navigate('dashboard'); });
document.getElementById('mobile-nav-home').addEventListener('click', e => { e.preventDefault(); closeMobileMenu(); navigate('home'); });
document.getElementById('mobile-nav-dashboard').addEventListener('click', e => { e.preventDefault(); closeMobileMenu(); navigate('dashboard'); });

// Hamburger
document.getElementById('hamburger').addEventListener('click', () => {
  const ham = document.getElementById('hamburger');
  const menu = document.getElementById('mobile-menu');
  ham.classList.toggle('open');
  menu.classList.toggle('open');
});
function closeMobileMenu() {
  document.getElementById('hamburger').classList.remove('open');
  document.getElementById('mobile-menu').classList.remove('open');
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.classList.toggle('scrolled', window.scrollY > 20);
});

// ===== HOME PAGE =====
function renderHome() {
  const totalEvents = events.length;
  const totalRegs = getTotalRegistrations();
  const totalPlatforms = platforms.length;
  const allCats = ['All', 'Tech', 'Sports', 'Cultural'];

  return `
  <div class="page">
    <section class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-badge">Live Community Events</div>
        <h1>Discover Events<br/>That Move You</h1>
        <p>Explore events across technology, sports &amp; culture hosted by top community organizations across the country.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
          <button class="btn btn-primary" style="width:auto;padding:13px 32px;" onclick="document.getElementById('platforms-section').scrollIntoView({behavior:'smooth'})">
            Explore Platforms <span>→</span>
          </button>
          <button class="btn btn-outline" style="width:auto;padding:13px 28px;" onclick="navigate('dashboard')">
            Organizer Dashboard
          </button>
        </div>
        <div class="hero-stats">
          <div class="stat-item">
            <div class="stat-num">${totalPlatforms}</div>
            <div class="stat-label">Platforms</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${totalEvents}</div>
            <div class="stat-label">Live Events</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${totalRegs}+</div>
            <div class="stat-label">Registrations</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">3</div>
            <div class="stat-label">Categories</div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="platforms-section">
      <!-- Section header -->
      <div class="section-header">
        <div>
          <h2 class="section-title">Community Platforms</h2>
          <p class="section-sub">Search, filter and bookmark platforms you love</p>
        </div>
        <span class="pl-result-count" id="pl-result-count">${totalPlatforms} platforms</span>
      </div>

      <!-- Search bar -->
      <div class="pl-search-wrap">
        <div class="pl-search-box">
          <svg class="pl-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 10l3.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input
            id="pl-search"
            class="pl-search-input"
            type="text"
            placeholder="Search platforms by name…"
            oninput="searchPlatforms(this.value)"
            autocomplete="off"
          />
          <button class="pl-search-clear" id="pl-search-clear" onclick="clearSearch()" title="Clear">✕</button>
        </div>
        <!-- Category filter tabs -->
        <div class="pl-cat-tabs" id="pl-cat-tabs">
          ${allCats.map(c => `
            <button
              class="pl-cat-tab ${c === 'All' ? 'active' : ''}"
              data-cat="${c}"
              onclick="filterPlatformsByCategory('${c}')">
              ${c === 'All' ? '✨' : catIcon(c)} ${c}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- Bookmarked platforms (shown only when bookmarks exist) -->
      <div id="pl-bookmarks-section" class="pl-bookmarks-section" style="display:none">
        <div class="pl-bookmarks-header">
          <span class="pl-bookmarks-label">🔖 Bookmarked</span>
          <button class="pl-clear-bookmarks" onclick="clearAllBookmarks()">Clear all</button>
        </div>
        <div class="grid-3" id="pl-bookmarks-grid"></div>
        <hr class="divider" style="margin-top:32px"/>
      </div>

      <!-- All platforms grid -->
      <div class="grid-3" id="pl-grid">
        ${platforms.map(p => renderPlatformCard(p)).join('')}
      </div>

      <!-- Empty search result state -->
      <div class="empty-state" id="pl-empty" style="display:none">
        <div class="empty-state-icon">🔍</div>
        <h3>No platforms found</h3>
        <p>Try a different name or clear the search filter.</p>
      </div>
    </section>

    <section class="section" style="padding-top:0">
      <div class="section-header">
        <div>
          <h2 class="section-title">Featured Events</h2>
          <p class="section-sub">Handpicked events happening soon</p>
        </div>
      </div>
      <div class="grid-3">
        ${events.slice(0, 6).map(e => renderEventCard(e)).join('')}
      </div>
    </section>

    <footer class="footer">
      <div class="footer-brand">⚡ EventSphere</div>
      <p>© 2026 EventSphere. All rights reserved. Built with ❤️ for communities.</p>
    </footer>
  </div>`;
}

// ── Platform card renderer ────────────────────────────────────────────────────
function renderPlatformCard(p, compact = false) {
  const evCount = getEventsByPlatform(p.id).length;
  const bookmarked = Bookmarks.has(p.id);
  const openCount  = getEventsByPlatform(p.id).filter(e => isRegistrationOpen(e)).length;

  return `
  <div class="platform-card fade-in" style="--color-a:${p.colorA};--color-b:${p.colorB}" id="plcard-${p.id}">

    <!-- Bookmark button (top-right) -->
    <button
      class="pl-bookmark-btn ${bookmarked ? 'bookmarked' : ''}"
      id="bm-${p.id}"
      onclick="toggleBookmark(event, '${p.id}')"
      title="${bookmarked ? 'Remove bookmark' : 'Bookmark this platform'}"
      aria-label="Bookmark">
      ${bookmarked ? '🔖' : '🏷️'}
    </button>

    <!-- Icon + name + desc -->
    <div class="platform-icon">${p.icon}</div>
    <div class="platform-name">${p.name}</div>
    <div class="platform-desc">${p.description}</div>

    <!-- Category tags -->
    <div class="platform-tags" style="margin-bottom:16px">
      ${p.categories.map(c => `<span class="tag tag-${c.toLowerCase()}">${catIcon(c)} ${c}</span>`).join('')}
    </div>

    <!-- Meta row + CTA -->
    <div class="platform-meta">
      <div class="platform-event-count">
        <strong>${evCount}</strong> events
        ${openCount > 0 ? `<span class="pl-open-dot" title="${openCount} open for registration">● ${openCount} open</span>` : ''}
      </div>
      <button
        class="btn btn-primary btn-sm pl-view-btn"
        onclick="navigate('platform',{platformId:'${p.id}'})">
        View Platform →
      </button>
    </div>
  </div>`;
}

// ── Platform search / filter helpers ─────────────────────────────────────────
let _plActiveCat = 'All';
let _plQuery     = '';

function _applyPlatformFilters() {
  const grid    = document.getElementById('pl-grid');
  const empty   = document.getElementById('pl-empty');
  const counter = document.getElementById('pl-result-count');
  const clearBtn = document.getElementById('pl-search-clear');

  if (!grid) return;

  const q = _plQuery.trim().toLowerCase();
  clearBtn && (clearBtn.style.display = q ? 'flex' : 'none');

  let filtered = Store.getAllPlatforms();

  // Category filter
  if (_plActiveCat !== 'All') {
    filtered = filtered.filter(p => p.categories.includes(_plActiveCat));
  }

  // Name search
  if (q) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(q));
  }

  counter && (counter.textContent = `${filtered.length} platform${filtered.length !== 1 ? 's' : ''}`);

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty && (empty.style.display = 'block');
  } else {
    empty && (empty.style.display = 'none');
    grid.innerHTML = filtered.map(p => renderPlatformCard(p)).join('');
  }

  _renderBookmarksSection();
}

function searchPlatforms(query) {
  _plQuery = query;
  _applyPlatformFilters();
}

function clearSearch() {
  _plQuery = '';
  const input = document.getElementById('pl-search');
  if (input) input.value = '';
  _applyPlatformFilters();
}

function filterPlatformsByCategory(cat) {
  _plActiveCat = cat;
  // Update active tab
  document.querySelectorAll('.pl-cat-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });
  _applyPlatformFilters();
}

// ── Bookmark toggle ───────────────────────────────────────────────────────────
function toggleBookmark(e, platformId) {
  e.stopPropagation(); // don't bubble through the card
  const isNow = Bookmarks.toggle(platformId);

  // Update the button in the main grid
  const btn = document.getElementById(`bm-${platformId}`);
  if (btn) {
    btn.textContent  = isNow ? '🔖' : '🏷️';
    btn.title        = isNow ? 'Remove bookmark' : 'Bookmark this platform';
    btn.classList.toggle('bookmarked', isNow);
  }

  _renderBookmarksSection();
  showToast(isNow ? '🔖 Platform bookmarked!' : '✕ Bookmark removed');
}

function clearAllBookmarks() {
  localStorage.removeItem(BOOKMARK_KEY);
  // Reset all bookmark buttons in the DOM
  document.querySelectorAll('.pl-bookmark-btn').forEach(btn => {
    btn.textContent = '🏷️';
    btn.title       = 'Bookmark this platform';
    btn.classList.remove('bookmarked');
  });
  _renderBookmarksSection();
  showToast('All bookmarks cleared');
}

function _renderBookmarksSection() {
  const section = document.getElementById('pl-bookmarks-section');
  const grid    = document.getElementById('pl-bookmarks-grid');
  if (!section || !grid) return;

  const ids = Bookmarks.all();
  if (ids.length === 0) {
    section.style.display = 'none';
    return;
  }

  const bookmarkedPlatforms = ids
    .map(id => Store.getPlatformById(id))
    .filter(Boolean);

  section.style.display = 'block';
  grid.innerHTML = bookmarkedPlatforms.map(p => renderPlatformCard(p)).join('');
}

function renderEventCard(ev) {
  const platform = getPlatformById(ev.platformId);
  const open = isRegistrationOpen(ev);
  const pct = Math.round((ev.filledSpots / ev.maxSpots) * 100);
  return `
  <div class="event-card fade-in" id="ecard-${ev.id}" onclick="navigate('event',{eventId:'${ev.id}',platformId:'${ev.platformId}'})">
    <div class="event-card-top">
      <div class="event-category-badge ${catBadgeClass(ev.category)}">${catIcon(ev.category)} ${ev.category}</div>
      <div class="event-title">${ev.title}</div>
      <div class="event-desc">${ev.description}</div>
    </div>
    <div class="event-card-footer">
      <div>
        <div class="event-reg-info">
          <strong>${open ? 'Open' : 'Closed'}</strong> · ${ev.filledSpots}/${ev.maxSpots} registered
        </div>
        <div style="margin-top:6px;font-size:0.75rem;color:var(--text-faint)">${platform?.name || ''}</div>
      </div>
      <div class="event-arrow">→</div>
    </div>
  </div>`;
}

// ===== EVENT STATUS HELPER =====
/**
 * Returns { label, key } where key is  'live' | 'soon' | 'closed'
 * based on the current time vs registrationStart / registrationEnd.
 */
function getEventStatus(event) {
  const now   = new Date();
  const start = new Date(event.registrationStart);
  const end   = new Date(event.registrationEnd);

  if (now < start)  return { label: 'Starting Soon', key: 'soon'   };
  if (now <= end)   return { label: 'Live',           key: 'live'   };
  return               { label: 'Closed',          key: 'closed' };
}

// ===== PLATFORM PAGE =====
function renderPlatformPage() {
  const platform = getPlatformById(currentPlatformId);
  if (!platform) return '<div class="section"><p>Platform not found.</p></div>';

  const platformEvents = getEventsByPlatform(currentPlatformId);

  // Category tabs: All + unique categories present
  const uniqueCats = ['All', ...new Set(platformEvents.map(e => e.category))];

  // Stats
  const liveCount  = platformEvents.filter(e => getEventStatus(e).key === 'live').length;
  const soonCount  = platformEvents.filter(e => getEventStatus(e).key === 'soon').length;
  const closedCount= platformEvents.filter(e => getEventStatus(e).key === 'closed').length;
  const totalRegs  = platformEvents.reduce((s, e) => s + e.registrations.length, 0);

  return `
  <div class="page">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">${platform.name}</span>
    </div>

    <!-- Platform Hero -->
    <div class="platform-hero">
      <div class="platform-hero-bg" style="background:radial-gradient(ellipse 70% 100% at -10% 50%, ${platform.colorA}33 0%, transparent 70%)"></div>
      <div class="platform-hero-content">
        <div class="platform-hero-icon" style="background:linear-gradient(135deg,${platform.colorA},${platform.colorB})">${platform.icon}</div>
        <div class="platform-hero-text">
          <h1 class="platform-hero-name">${platform.name}</h1>
          <p class="platform-hero-desc">${platform.description}</p>
          <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;align-items:center">
            ${platform.categories.map(c => `<span class="tag tag-${c.toLowerCase()}">${catIcon(c)} ${c}</span>`).join('')}
          </div>
        </div>
        <!-- Bookmark button for this platform -->
        <button
          class="pl-bookmark-btn ${Bookmarks.has(platform.id) ? 'bookmarked' : ''}"
          id="pdp-bm-${platform.id}"
          onclick="togglePlatformBookmark(event,'${platform.id}')"
          title="${Bookmarks.has(platform.id) ? 'Remove bookmark' : 'Bookmark this platform'}"
          style="position:static;margin-left:auto;flex-shrink:0">
          ${Bookmarks.has(platform.id) ? '🔖' : '🏷️'}
        </button>
      </div>
    </div>

    <!-- Stats bar -->
    <div class="pdp-stats-bar">
      <div class="pdp-stat">
        <span class="pdp-stat-value">${platformEvents.length}</span>
        <span class="pdp-stat-label">Total Events</span>
      </div>
      <div class="pdp-stat-divider"></div>
      <div class="pdp-stat">
        <span class="pdp-stat-value" style="color:var(--success)">${liveCount}</span>
        <span class="pdp-stat-label">Live Now</span>
      </div>
      <div class="pdp-stat-divider"></div>
      <div class="pdp-stat">
        <span class="pdp-stat-value" style="color:var(--warning)">${soonCount}</span>
        <span class="pdp-stat-label">Starting Soon</span>
      </div>
      <div class="pdp-stat-divider"></div>
      <div class="pdp-stat">
        <span class="pdp-stat-value" style="color:var(--text-muted)">${closedCount}</span>
        <span class="pdp-stat-label">Closed</span>
      </div>
      <div class="pdp-stat-divider"></div>
      <div class="pdp-stat">
        <span class="pdp-stat-value">${totalRegs}</span>
        <span class="pdp-stat-label">Registrations</span>
      </div>
    </div>

    <!-- Events section -->
    <div class="section">
      <!-- Category filter tabs -->
      <div class="pdp-filter-row">
        <div class="pdp-cat-tabs" id="pdp-cat-tabs">
          ${uniqueCats.map(c => `
            <button
              class="pdp-cat-tab ${c === 'All' ? 'active' : ''}"
              data-cat="${c}"
              onclick="filterEvents('${c}')">
              ${c === 'All' ? '✨' : catIcon(c)} ${c}
              <span class="pdp-cat-count">${c === 'All' ? platformEvents.length : platformEvents.filter(e => e.category === c).length}</span>
            </button>
          `).join('')}
        </div>
        <span class="pdp-events-counter" id="events-count">${platformEvents.length} event${platformEvents.length !== 1 ? 's' : ''}</span>
      </div>

      <!-- Events grid -->
      <div class="pdp-events-grid" id="events-grid">
        ${platformEvents.map(e => renderPlatformEventCard(e)).join('')}
      </div>
    </div>

    <footer class="footer">
      <div class="footer-brand">⚡ EventSphere</div>
      <p>© 2026 EventSphere. All rights reserved.</p>
    </footer>
  </div>`;
}

/**
 * Event card rendered inside the platform detail page.
 * Shows status badge (Live / Starting Soon / Closed) + explicit View Event button.
 */
function renderPlatformEventCard(ev) {
  const status  = getEventStatus(ev);
  const pct     = ev.maxSpots ? Math.round((ev.filledSpots / ev.maxSpots) * 100) : 0;
  const spotsLeft = ev.maxSpots - ev.filledSpots;

  return `
  <div class="pdp-event-card fade-in" id="pdp-ev-${ev.id}">
    <!-- Top accent line uses category colour -->
    <div class="pdp-event-card-accent ${catAccentClass(ev.category)}"></div>

    <div class="pdp-event-card-body">
      <!-- Row 1: category badge + status -->
      <div class="pdp-event-card-header">
        <span class="event-category-badge ${catBadgeClass(ev.category)}">${catIcon(ev.category)} ${ev.category}</span>
        <span class="pdp-status-badge pdp-status-${status.key}">
          <span class="pdp-status-dot"></span>${status.label}
        </span>
      </div>

      <!-- Title -->
      <h3 class="pdp-event-title">${ev.title}</h3>

      <!-- Description (2-line clamp) -->
      <p class="pdp-event-desc">${ev.description}</p>

      <!-- Capacity bar -->
      <div class="pdp-capacity">
        <div class="pdp-capacity-bar-track">
          <div class="pdp-capacity-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${pct >= 90 ? 'var(--danger),#f87171' : 'var(--success),var(--accent)'})"></div>
        </div>
        <div class="pdp-capacity-meta">
          <span>${spotsLeft > 0 ? `${spotsLeft} spots left` : 'Fully booked'}</span>
          <span>${pct}% filled</span>
        </div>
      </div>

      <!-- Dates -->
      <div class="pdp-event-dates">
        <span>🗓 Opens: ${formatDate(ev.registrationStart)}</span>
        <span>⏰ Closes: ${formatDate(ev.registrationEnd)}</span>
      </div>
    </div>

    <!-- Footer CTA -->
    <div class="pdp-event-card-footer">
      <span class="pdp-reg-count">${ev.registrations.length} registered</span>
      <button
        class="btn btn-primary btn-sm pdp-view-btn"
        onclick="navigate('event',{eventId:'${ev.id}',platformId:'${ev.platformId}'})">
        View Event →
      </button>
    </div>
  </div>`;
}

/** Accent-line class mapped to category */
function catAccentClass(cat) {
  return { Tech: 'accent-tech', Sports: 'accent-sports', Cultural: 'accent-cultural' }[cat] || 'accent-tech';
}

function filterEvents(cat) {
  // Update active tab
  document.querySelectorAll('.pdp-cat-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cat === cat);
  });

  const platformEvents = getEventsByPlatform(currentPlatformId);
  const filtered = cat === 'All' ? platformEvents : platformEvents.filter(e => e.category === cat);

  const counter = document.getElementById('events-count');
  if (counter) counter.textContent = `${filtered.length} event${filtered.length !== 1 ? 's' : ''}`;

  const grid = document.getElementById('events-grid');
  if (grid) {
    grid.innerHTML = filtered.length
      ? filtered.map(e => renderPlatformEventCard(e)).join('')
      : `<div class="empty-state" style="grid-column:1/-1">
           <div class="empty-state-icon">🔍</div>
           <h3>No events in this category</h3>
           <p>Try selecting a different filter above.</p>
         </div>`;
  }
}

/** Bookmark toggle used on the platform detail page */
function togglePlatformBookmark(e, platformId) {
  e.stopPropagation();
  const isNow = Bookmarks.toggle(platformId);
  const btn = document.getElementById(`pdp-bm-${platformId}`);
  if (btn) {
    btn.textContent = isNow ? '🔖' : '🏷️';
    btn.title       = isNow ? 'Remove bookmark' : 'Bookmark this platform';
    btn.classList.toggle('bookmarked', isNow);
  }
  showToast(isNow ? '🔖 Platform bookmarked!' : '✕ Bookmark removed');
}

// ===== EVENT DETAIL PAGE =====
function renderEventDetail() {
  const event = getEventById(currentEventId);
  const platform = getPlatformById(event?.platformId || currentPlatformId);
  if (!event || !platform) return '<div class="section"><p>Event not found.</p></div>';

  const status   = getEventStatus(event);
  const open     = status.key === 'live';
  const pct      = event.maxSpots ? Math.round((event.filledSpots / event.maxSpots) * 100) : 0;
  const spotsLeft = event.maxSpots - event.filledSpots;

  return `
  <div class="page">
    <div class="breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-item" onclick="navigate('platform',{platformId:'${platform.id}'})"> ${platform.name}</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">${event.title}</span>
    </div>

    <div class="detail-layout">
      <!-- ═══ MAIN CONTENT ═══ -->
      <div class="detail-main fade-in">

        <!-- Category + Status row -->
        <div class="edp-top-row">
          <span class="event-category-badge ${catBadgeClass(event.category)}">${catIcon(event.category)} ${event.category}</span>
          <span class="edp-status-pill edp-status-${status.key}">
            <span class="edp-status-dot"></span>${status.label}
          </span>
        </div>

        <h1 class="detail-title">${event.title}</h1>
        <p class="detail-desc">${event.description}</p>

        <!-- Info grid -->
        <div class="info-grid">
          <div class="info-card">
            <div class="info-card-label">📅 Registration Opens</div>
            <div class="info-card-value">${formatDateTime(event.registrationStart)}</div>
          </div>
          <div class="info-card">
            <div class="info-card-label">⏰ Registration Closes</div>
            <div class="info-card-value">${formatDateTime(event.registrationEnd)}</div>
          </div>
          <div class="info-card">
            <div class="info-card-label">👥 Total Capacity</div>
            <div class="info-card-value">${event.maxSpots} spots</div>
          </div>
          <div class="info-card">
            <div class="info-card-label">✅ Registered</div>
            <div class="info-card-value">${event.filledSpots} people (${pct}% full)</div>
          </div>
        </div>

        <hr class="divider"/>

        <!-- Participants table -->
        <h2 style="font-size:1.2rem;margin-bottom:20px;">
          Registered Participants
          <span style="color:var(--text-muted);font-size:0.85rem;font-weight:400">(${event.registrations.length} shown)</span>
        </h2>
        <div class="table-wrapper" style="margin-bottom:32px">
          <table>
            <thead>
              <tr><th>#</th><th>Name</th><th>Email</th><th>Registered On</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${event.registrations.length > 0
                ? event.registrations.map((r, i) => `
                  <tr>
                    <td style="color:var(--text-faint)">${i + 1}</td>
                    <td>${r.name}</td>
                    <td>${r.email}</td>
                    <td>${formatDate(r.date)}</td>
                    <td><span class="status-badge status-${r.status}">${r.status}</span></td>
                  </tr>`).join('')
                : `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--text-faint)">No registrations yet. Be the first!</td></tr>`
              }
            </tbody>
          </table>
        </div>

        <!-- Bottom action row -->
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="navigate('platform',{platformId:'${platform.id}'})">
            ← Back to ${platform.name}
          </button>
          <button class="btn btn-primary btn-sm"
            ${open ? '' : 'disabled'}
            onclick="${open ? `navigate('register',{eventId:'${event.id}',platformId:'${platform.id}'})` : ''}">
            ${open ? '📝 Register Now →' : '🔒 Registration Closed'}
          </button>
        </div>
      </div>

      <!-- ═══ SIDEBAR ═══ -->
      <div class="detail-sidebar fade-up-2">
        <div class="sidebar-card">

          <!-- ── Countdown block ── -->
          <div class="edp-countdown-block edp-countdown-${status.key}" id="edp-countdown-block">
            <div class="edp-countdown-label" id="edp-countdown-label">${
              status.key === 'live'   ? '⏱ Registration ends in' :
              status.key === 'soon'  ? '🚀 Registration starts in' :
                                       '🔒 Registration Closed'
            }</div>
            ${status.key !== 'closed' ? `
            <div class="edp-countdown-timer" id="edp-countdown-timer">
              <div class="edp-cd-unit"><span class="edp-cd-num" id="cd-d">--</span><span class="edp-cd-lbl">Days</span></div>
              <span class="edp-cd-sep">:</span>
              <div class="edp-cd-unit"><span class="edp-cd-num" id="cd-h">--</span><span class="edp-cd-lbl">Hrs</span></div>
              <span class="edp-cd-sep">:</span>
              <div class="edp-cd-unit"><span class="edp-cd-num" id="cd-m">--</span><span class="edp-cd-lbl">Min</span></div>
              <span class="edp-cd-sep">:</span>
              <div class="edp-cd-unit"><span class="edp-cd-num" id="cd-s">--</span><span class="edp-cd-lbl">Sec</span></div>
            </div>` : ''}
          </div>

          <!-- ── Capacity bar ── -->
          <div class="spots-bar" style="margin-top:20px">
            <div class="spots-bar-label">
              <span>${spotsLeft > 0 ? `${spotsLeft} spots left` : '<span style="color:var(--danger)">Fully booked</span>'}</span>
              <span>${pct}% filled</span>
            </div>
            <div class="spots-bar-track">
              <div class="spots-bar-fill" style="width:${pct}%;background:linear-gradient(90deg,${pct >= 90 ? 'var(--danger),#f87171' : 'var(--success),var(--accent)'})"></div>
            </div>
          </div>

          <!-- ── QR Code ── -->
          <div class="sidebar-title" style="margin:20px 0 12px">📱 Scan to Join</div>
          <div class="qr-wrapper" id="qr-wrapper">
            <img
              src="${event.qr || 'qr_sample.png'}"
              alt="QR Code for ${event.title}"
              onerror="this.closest('#qr-wrapper').innerHTML='<div class=\\'qr-placeholder\\'><div class=\\'qr-placeholder-icon\\'>📷</div><div>QR Code Unavailable</div></div>'"
            />
          </div>

          <!-- ── CTAs ── -->
          <button
            id="sidebar-register-btn"
            class="btn ${open ? 'btn-primary' : 'btn-outline'}"
            style="margin-top:4px${open ? '' : ';opacity:0.5;cursor:not-allowed'}"
            ${open ? `onclick="navigate('register',{eventId:'${event.id}',platformId:'${platform.id}'})"` : 'disabled'}
          >
            ${open ? '📝 Register Now' : '🔒 Registration Closed'}
          </button>

          <a class="btn btn-whatsapp"
            href="${event.whatsappLink || '#'}"
            target="_blank" rel="noopener"
            style="margin-top:10px${!event.whatsappLink ? ';opacity:0.45;pointer-events:none' : ''}">
            💬 Join WhatsApp Group
          </a>

          <hr class="divider"/>

          <div class="info-card" style="margin-top:0">
            <div class="info-card-label">🏢 Hosted by</div>
            <div class="info-card-value" style="cursor:pointer;color:var(--primary-light)"
              onclick="navigate('platform',{platformId:'${platform.id}'})"><br/>${platform.name}</div>
          </div>
          <div class="info-card" style="margin-top:12px">
            <div class="info-card-label">🔒 Visibility</div>
            <div class="info-card-value" style="text-transform:capitalize">${event.visibility || 'public'}</div>
          </div>

        </div>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-brand">⚡ EventSphere</div>
      <p>© 2026 EventSphere. All rights reserved.</p>
    </footer>
  </div>`;
}

// ===== REGISTRATION FORM PAGE =====
function renderRegisterPage() {
  const event = getEventById(currentEventId);
  const platform = getPlatformById(event?.platformId || currentPlatformId);
  if (!event) return '<div class="section"><p>Event not found.</p></div>';

  return `
  <div class="page">
    <div class="breadcrumb">
      <span class="breadcrumb-item" onclick="navigate('home')">Home</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-item" onclick="navigate('platform',{platformId:'${platform?.id}'})"> ${platform?.name}</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-item" onclick="navigate('event',{eventId:'${event.id}',platformId:'${platform?.id}'})"> ${event.title}</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">Register</span>
    </div>

    <div class="form-page">
      <!-- Event summary mini card -->
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:18px 22px;margin-bottom:24px;display:flex;align-items:center;gap:14px;">
        <div class="event-category-badge ${catBadgeClass(event.category)}" style="margin:0;font-size:0.7rem">${catIcon(event.category)} ${event.category}</div>
        <div>
          <div style="font-weight:700;font-size:0.95rem">${event.title}</div>
          <div style="color:var(--text-muted);font-size:0.78rem">${platform?.name} · Closes ${formatDate(event.registrationEnd)}</div>
        </div>
      </div>

      <div class="form-card">
        <h1 class="form-title">Register for Event</h1>
        <p class="form-sub">Fill out the details below to secure your spot. You'll receive a confirmation on your WhatsApp.</p>

        <form id="reg-form" novalidate>
          <div class="form-row">
            <div class="form-group" id="grp-firstname">
              <label class="form-label" for="firstname">First Name *</label>
              <input class="form-control" id="firstname" type="text" placeholder="Arjun" />
              <div class="form-error" id="err-firstname">Please enter your first name.</div>
            </div>
            <div class="form-group" id="grp-lastname">
              <label class="form-label" for="lastname">Last Name *</label>
              <input class="form-control" id="lastname" type="text" placeholder="Mehta" />
              <div class="form-error" id="err-lastname">Please enter your last name.</div>
            </div>
          </div>

          <div class="form-group" id="grp-email">
            <label class="form-label" for="email">Email Address *</label>
            <input class="form-control" id="email" type="email" placeholder="you@example.com" />
            <div class="form-error" id="err-email">Please enter a valid email address.</div>
          </div>

          <div class="form-row">
            <div class="form-group" id="grp-phone">
              <label class="form-label" for="phone">Phone Number *</label>
              <input class="form-control" id="phone" type="tel" placeholder="9876543210" maxlength="10" />
              <div class="form-error" id="err-phone">Please enter a valid 10-digit phone number.</div>
            </div>
            <div class="form-group" id="grp-age">
              <label class="form-label" for="age">Age</label>
              <input class="form-control" id="age" type="number" placeholder="22" min="10" max="100" />
            </div>
          </div>

          <div class="form-group" id="grp-city">
            <label class="form-label" for="city">City *</label>
            <input class="form-control" id="city" type="text" placeholder="Mumbai" />
            <div class="form-error" id="err-city">Please enter your city.</div>
          </div>

          <div class="form-group" id="grp-experience">
            <label class="form-label" for="experience">Experience Level</label>
            <select class="form-select" id="experience">
              <option value="">Select level...</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="professional">Professional</option>
            </select>
          </div>

          <div class="form-group" id="grp-how">
            <label class="form-label" for="how">How did you hear about this event?</label>
            <select class="form-select" id="how">
              <option value="">Select source...</option>
              <option value="social">Social Media</option>
              <option value="friend">Friend / Colleague</option>
              <option value="email">Email Newsletter</option>
              <option value="website">EventSphere Website</option>
              <option value="whatsapp">WhatsApp Group</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="notes">Additional Notes</label>
            <textarea class="form-control" id="notes" rows="3" placeholder="Any dietary requirements, accessibility needs or questions..."></textarea>
          </div>

          <div class="form-group" id="grp-terms">
            <label class="form-check">
              <input type="checkbox" id="terms" />
              <span class="form-check-label">I agree to the <a href="#">Terms & Conditions</a> and <a href="#">Privacy Policy</a>. I understand that my registration is subject to availability.</span>
            </label>
            <div class="form-error" id="err-terms">You must agree to the terms to register.</div>
          </div>

          <button type="submit" class="btn btn-primary" id="submit-btn">
            🎉 Complete Registration
          </button>
          <button type="button" class="btn btn-outline" style="margin-top:10px" onclick="navigate('event',{eventId:'${event.id}',platformId:'${platform?.id}'})">
            ← Cancel
          </button>
        </form>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-brand">⚡ EventSphere</div>
      <p>© 2025 EventSphere. All rights reserved.</p>
    </footer>
  </div>`;
}

// ===== DASHBOARD PAGE =====
function renderDashboard() {
  const totalRegs = getTotalRegistrations();
  const totalEvents = events.length;
  const openEvents = events.filter(e => isRegistrationOpen(e)).length;
  const totalPlatforms = platforms.length;

  // Category breakdown
  const techCount = events.filter(e => e.category === 'Tech').length;
  const sportsCount = events.filter(e => e.category === 'Sports').length;
  const culturalCount = events.filter(e => e.category === 'Cultural').length;

  // All registrations flat list
  const allRegistrations = [];
  events.forEach(ev => {
    const plat = getPlatformById(ev.platformId);
    ev.registrations.forEach(r => {
      allRegistrations.push({ ...r, eventTitle: ev.title, platformName: plat?.name || '' });
    });
  });

  // Platform event counts
  const platformStats = platforms.map(p => ({
    name: p.name,
    icon: p.icon,
    events: getEventsByPlatform(p.id).length,
    regs: events.filter(e => e.platformId === p.id).reduce((sum, e) => sum + e.registrations.length, 0),
    colorA: p.colorA, colorB: p.colorB
  }));

  const maxPlatformRegs = Math.max(...platformStats.map(p => p.regs));

  // Donut chart segments
  const total = techCount + sportsCount + culturalCount;
  const donutR = 50; const donutC = 60;
  const techDeg = (techCount / total) * 360;
  const sportsDeg = (sportsCount / total) * 360;
  const culturalDeg = (culturalCount / total) * 360;

  return `
  <div class="page">
    <div class="dashboard-page">
      <div class="dashboard-header fade-in">
        <h1 class="dashboard-title">📊 Organizer Dashboard</h1>
        <p class="dashboard-sub">Overview of all platforms, events, and registrations</p>
      </div>

      <!-- STATS GRID -->
      <div class="stats-grid fade-up-1">
        <div class="stat-card" style="--color-a:#6366f1;--color-b:#8b5cf6">
          <div class="stat-card-icon">🏢</div>
          <div class="stat-card-value">${totalPlatforms}</div>
          <div class="stat-card-label">Total Platforms</div>
          <div class="stat-card-change up">↑ All active</div>
        </div>
        <div class="stat-card" style="--color-a:#10b981;--color-b:#06b6d4">
          <div class="stat-card-icon">📅</div>
          <div class="stat-card-value">${totalEvents}</div>
          <div class="stat-card-label">Total Events</div>
          <div class="stat-card-change up">↑ ${openEvents} open now</div>
        </div>
        <div class="stat-card" style="--color-a:#f59e0b;--color-b:#ec4899">
          <div class="stat-card-icon">👥</div>
          <div class="stat-card-value">${totalRegs}</div>
          <div class="stat-card-label">Total Registrations</div>
          <div class="stat-card-change up">↑ Growing daily</div>
        </div>
        <div class="stat-card" style="--color-a:#06b6d4;--color-b:#6366f1">
          <div class="stat-card-icon">✅</div>
          <div class="stat-card-value">${openEvents}</div>
          <div class="stat-card-label">Open for Registration</div>
          <div class="stat-card-change">${totalEvents - openEvents} closed</div>
        </div>
      </div>

      <!-- CHARTS ROW -->
      <div class="chart-row fade-up-2">
        <div class="chart-card">
          <div class="chart-title">Registrations by Platform</div>
          <div class="bar-chart">
            ${platformStats.map(p => `
              <div class="bar-item">
                <div class="bar-label">${p.icon} ${p.name.split(' ')[0]}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${maxPlatformRegs ? Math.round((p.regs / maxPlatformRegs) * 100) : 0}%;background:linear-gradient(90deg,${p.colorA},${p.colorB})"></div>
                </div>
                <div class="bar-value">${p.regs}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-title">Events by Category</div>
          <div class="donut-chart">
            <svg width="120" height="120" class="donut-svg" viewBox="0 0 120 120">
              ${renderDonutChart([
                { count: techCount, color: '#6366f1', label: 'Tech' },
                { count: sportsCount, color: '#10b981', label: 'Sports' },
                { count: culturalCount, color: '#f59e0b', label: 'Cultural' }
              ], total)}
            </svg>
            <div class="donut-legend">
              <div class="legend-item">
                <div class="legend-dot" style="background:#6366f1"></div>
                <span class="legend-label">Tech</span>
                <span class="legend-val">${techCount}</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background:#10b981"></div>
                <span class="legend-label">Sports</span>
                <span class="legend-val">${sportsCount}</span>
              </div>
              <div class="legend-item">
                <div class="legend-dot" style="background:#f59e0b"></div>
                <span class="legend-label">Cultural</span>
                <span class="legend-val">${culturalCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- PLATFORM TABLE -->
      <div class="table-section fade-up-3">
        <div class="table-section-header">
          <div class="table-section-title">Platform Overview</div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Categories</th>
                <th>Events</th>
                <th>Registrations</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${platformStats.map(p => {
                const plat = platforms.find(pl => pl.name === p.name);
                return `
                <tr>
                  <td><span style="font-size:1.1rem;margin-right:8px">${p.icon}</span>${p.name}</td>
                  <td>${plat?.categories.map(c => `<span class="tag tag-${c.toLowerCase()}" style="margin-right:4px">${c}</span>`).join('') || ''}</td>
                  <td>${p.events}</td>
                  <td>${p.regs}</td>
                  <td><button class="btn btn-outline btn-sm" onclick="navigate('platform',{platformId:'${plat?.id}'})">View →</button></td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- ALL REGISTRATIONS TABLE -->
      <div class="table-section fade-up-4">
        <div class="table-section-header">
          <div class="table-section-title">All Registrations <span style="color:var(--text-muted);font-size:0.85rem;font-weight:400">(${allRegistrations.length} total)</span></div>
        </div>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Event</th>
                <th>Platform</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${allRegistrations.map(r => `
                <tr>
                  <td>${r.name}</td>
                  <td style="color:var(--text-faint)">${r.email}</td>
                  <td>${r.eventTitle}</td>
                  <td style="color:var(--text-faint)">${r.platformName}</td>
                  <td>${formatDate(r.date)}</td>
                  <td><span class="status-badge status-${r.status}">${r.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>

    <footer class="footer">
      <div class="footer-brand">⚡ EventSphere</div>
      <p>© 2025 EventSphere. All rights reserved.</p>
    </footer>
  </div>`;
}

// ===== DONUT CHART SVG HELPER =====
function renderDonutChart(segments, total) {
  if (total === 0) return '<circle cx="60" cy="60" r="40" fill="none" stroke="#1e293b" stroke-width="20"/>';
  const cx = 60, cy = 60, r = 40;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  let paths = '';
  paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${segments[0].color}" stroke-width="20" stroke-dasharray="${circumference}" stroke-dashoffset="0" transform="rotate(-90 ${cx} ${cy})"/>`;

  // Pie slices using stroke-dasharray trick
  let accumulated = 0;
  segments.forEach(seg => {
    const frac = seg.count / total;
    const dash = frac * circumference;
    const gap = circumference - dash;
    const rotationDeg = (accumulated / total) * 360 - 90;
    paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${seg.color}" stroke-width="20" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="0" transform="rotate(${rotationDeg} ${cx} ${cy})" style="transition:all 1s ease"/>`;
    accumulated += seg.count;
  });

  // center text
  paths += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="white" font-size="14" font-family="Outfit" font-weight="700">${total}</text>`;
  paths += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="#64748b" font-size="8" font-family="Inter">events</text>`;
  return paths;
}

// ===== ATTACH PAGE EVENTS =====
function attachPageEvents() {
  // Form submission
  const form = document.getElementById('reg-form');
  if (form) form.addEventListener('submit', handleFormSubmit);

  // Restore bookmarks section + clear button visibility on home render
  if (currentPage === 'home') {
    _renderBookmarksSection();
    const clearBtn = document.getElementById('pl-search-clear');
    if (clearBtn) clearBtn.style.display = 'none';
  }

  // Start countdown timer on event detail page
  if (currentPage === 'event' && currentEventId) {
    startCountdown(currentEventId);
  }
}

function handleFormSubmit(e) {
  e.preventDefault();
  let valid = true;

  const fields = [
    { id: 'firstname', grp: 'grp-firstname', validate: v => v.trim().length > 0 },
    { id: 'lastname', grp: 'grp-lastname', validate: v => v.trim().length > 0 },
    { id: 'email', grp: 'grp-email', validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
    { id: 'phone', grp: 'grp-phone', validate: v => /^\d{10}$/.test(v) },
    { id: 'city', grp: 'grp-city', validate: v => v.trim().length > 0 },
  ];

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    const grp = document.getElementById(f.grp);
    if (el && grp) {
      if (!f.validate(el.value)) {
        grp.classList.add('error');
        valid = false;
      } else {
        grp.classList.remove('error');
      }
    }
  });

  // Terms
  const terms = document.getElementById('terms');
  const termsGrp = document.getElementById('grp-terms');
  if (terms && !terms.checked) {
    termsGrp.classList.add('error');
    valid = false;
  } else if (terms) {
    termsGrp.classList.remove('error');
  }

  if (!valid) return;

  // Persist via Store (localStorage-backed)
  const result = Store.registerUser(currentEventId, {
    name:   `${document.getElementById('firstname').value} ${document.getElementById('lastname').value}`,
    email:  document.getElementById('email').value,
    phone:  document.getElementById('phone').value,
    status: 'Pending',
  });

  if (!result.ok) {
    // Surface storage / duplicate / capacity errors without leaving the form
    showToast(`⚠️ ${result.error}`);
    return;
  }

  showToast('🎉 Registration successful! Check your WhatsApp for confirmation.');

  setTimeout(() => {
    navigate('event', { eventId: currentEventId, platformId: currentPlatformId });
  }, 1800);
}

// ===== TOAST =====
function showToast(msg) {
  const toast = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

// ===== CATEGORY HELPERS =====
function catBadgeClass(cat) {
  const map = { Tech: 'tag-tech', Sports: 'tag-sports', Cultural: 'tag-cultural' };
  return map[cat] || 'tag-tech';
}
function catIcon(cat) {
  const map = { Tech: '⚡', Sports: '🏃', Cultural: '🎨', All: '✨' };
  return map[cat] || '📌';
}

// ===== INIT =====
renderPage();
updateNavActive();
