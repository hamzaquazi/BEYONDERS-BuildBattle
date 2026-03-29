// ===== ROUTER STATE =====
let currentPage = 'home';
let currentPlatformId = null;
let currentEventId = null;
let _countdownInterval = null; // cleared on every navigate()

// ===== AUTH STATE =====
let currentUser = JSON.parse(localStorage.getItem('es_user')) || null;

// ===== NOTIFICATION STORE =====
const NOTIF_KEY = 'es_notifications';

const NotifStore = {
  // Notification types: registration | event_soon | closing_soon | event_updated
  _read() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || []; }
    catch { return []; }
  },
  _write(items) {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(items.slice(0, 50))); // cap at 50
  },

  /** Push a new notification */
  push({ type = 'info', title, message, eventId = null }) {
    const items = this._read();
    items.unshift({
      id:      Date.now(),
      type,          // 'registration' | 'event_soon' | 'closing_soon' | 'event_updated' | 'info'
      title,
      message,
      eventId,
      read:    false,
      time:    new Date().toISOString(),
    });
    this._write(items);
    this._updateBadge();
    renderNotifPanel();
  },

  all()       { return this._read(); },
  unreadCount(){ return this._read().filter(n => !n.read).length; },

  markAllRead() {
    const items = this._read().map(n => ({ ...n, read: true }));
    this._write(items);
    this._updateBadge();
  },

  markRead(id) {
    const items = this._read().map(n => n.id === id ? { ...n, read: true } : n);
    this._write(items);
    this._updateBadge();
  },

  clear() {
    this._write([]);
    this._updateBadge();
  },

  /** Sync the red badge number on the bell */
  _updateBadge() {
    const count  = this.unreadCount();
    const badge  = document.getElementById('notif-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  },

  /** Map type → icon emoji */
  icon(type) {
    return { registration: '✅', event_soon: '⏰', closing_soon: '🔴', event_updated: '📝', info: 'ℹ️' }[type] || '🔔';
  },

  /** Map type → CSS class */
  colorClass(type) {
    return { registration: 'notif-green', event_soon: 'notif-yellow', closing_soon: 'notif-red', event_updated: 'notif-blue', info: 'notif-gray' }[type] || 'notif-gray';
  },
};

/** Render/refresh the notification list inside the panel */
function renderNotifPanel() {
  const list  = document.getElementById('notif-list');
  const items = NotifStore.all();
  NotifStore._updateBadge();
  if (!list) return;
  if (items.length === 0) {
    list.innerHTML = '<div class="notif-empty">You\'re all caught up! 🎉</div>';
    return;
  }
  list.innerHTML = items.map(n => `
    <div class="notif-item ${n.read ? '' : 'notif-unread'} ${NotifStore.colorClass(n.type)}"
      onclick="NotifStore.markRead(${n.id});renderNotifPanel();${n.eventId ? `navigate('event',{eventId:'${n.eventId}'});closeNotifPanel();` : ''}">
      <div class="notif-item-icon">${NotifStore.icon(n.type)}</div>
      <div class="notif-item-body">
        <div class="notif-item-title">${n.title}</div>
        <div class="notif-item-msg">${n.message}</div>
        <div class="notif-item-time">${_timeAgo(n.time)}</div>
      </div>
      ${!n.read ? '<div class="notif-dot"></div>' : ''}
    </div>`).join('');
}

function _timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff/3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
}

/** Toggle notification dropdown */
function toggleNotifPanel(e) {
  e.stopPropagation();
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  panel.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) { NotifStore.markAllRead(); renderNotifPanel(); }
}

function closeNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (panel) panel.style.display = 'none';
}

// Close panel when clicking anywhere outside the bell
document.addEventListener('click', e => {
  const wrap = document.getElementById('notif-bell-wrap');
  if (wrap && !wrap.contains(e.target)) closeNotifPanel();
});

// ===== BROWSER PUSH NOTIFICATIONS =====
let _browserNotifPermission = Notification?.permission || 'default';

function requestBrowserNotifPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().then(p => { _browserNotifPermission = p; });
  }
}

function showBrowserNotification(title, body, { icon = '🔔', tag } = {}) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.ico', tag });
  } catch (_) { /* silently ignore unsupported contexts */ }
}

// ===== SMART EVENT ALERTS =====
// Called once on load — checks all events and queues alerts
function checkEventAlerts() {
  const now = Date.now();
  const SOON_MS     = 24 * 60 * 60 * 1000;  // 24 h → "starting soon"
  const CLOSING_MS  =  2 * 60 * 60 * 1000;  // 2 h  → "closing soon"

  events.forEach(ev => {
    const start = new Date(ev.registrationStart).getTime();
    const end   = new Date(ev.registrationEnd).getTime();
    const alertedKey = `es_alerted_${ev.id}`;

    // Already alerted this session? skip.
    if (sessionStorage.getItem(alertedKey)) return;

    const msToStart = start - now;
    const msToEnd   = end   - now;

    if (msToStart > 0 && msToStart <= SOON_MS) {
      // Event registration opening within 24 h
      NotifStore.push({
        type:    'event_soon',
        title:   'Event Starting Soon 🎉',
        message: `"${ev.title}" registration opens in ${_fmtDuration(msToStart)}.`,
        eventId: ev.id,
      });
      sessionStorage.setItem(alertedKey, '1');
    } else if (now >= start && msToEnd > 0 && msToEnd <= CLOSING_MS) {
      // Event registration closing within 2 h
      NotifStore.push({
        type:    'closing_soon',
        title:   'Registration Closing Soon ⚠️',
        message: `"${ev.title}" closes in ${_fmtDuration(msToEnd)}. Register now!`,
        eventId: ev.id,
      });
      sessionStorage.setItem(alertedKey, '1');
    }
  });
}

function _fmtDuration(ms) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

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
function navigate(page, opts = {}, skipHistory = false) {
  // Always kill any running countdown first
  if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }

  // Route protection
  if (!currentUser && page !== 'login') {
    return navigate('login', {}, skipHistory);
  }
  
  if (currentUser && page === 'login') {
    return navigate('home', {}, skipHistory);
  }

  // Role-based routing: students not allowed on dashboard
  if (page === 'dashboard' && currentUser.role !== 'organizer') {
    showToast('Access denied: Organizer only.');
    return navigate('home', {}, skipHistory);
  }

  currentPage = page;
  if (opts.platformId !== undefined) currentPlatformId = opts.platformId;
  if (opts.eventId !== undefined)   currentEventId   = opts.eventId;

  // ── Store current state in localStorage ─────────────────────────────────────
  localStorage.setItem('es_currentPage', currentPage);
  if (currentPlatformId) {
    localStorage.setItem('es_currentPlatformId', currentPlatformId);
  } else {
    localStorage.removeItem('es_currentPlatformId');
  }
  if (currentEventId) {
    localStorage.setItem('es_currentEventId', currentEventId);
  } else {
    localStorage.removeItem('es_currentEventId');
  }

  // ── Push State to browser history ───────────────────────────────────────────
  if (!skipHistory) {
    let url = "?page=" + page;
    if (currentPlatformId) url += "&pl=" + currentPlatformId;
    if (currentEventId) url += "&ev=" + currentEventId;
    window.history.pushState({ page, platformId: currentPlatformId, eventId: currentEventId }, "", url);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  renderPage();
  updateNavActive();
}

// ── Handle Browser Back/Forward buttons ─────────────────────────────────────
window.addEventListener('popstate', (e) => {
  if (e.state) {
    navigate(e.state.page, { platformId: e.state.platformId, eventId: e.state.eventId }, true);
  } else {
    navigate('home', {}, true);
  }
});

function updateNavActive() {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  if (currentPage === 'home') {
    document.getElementById('nav-link-home')?.classList.add('active');
  } else if (currentPage === 'dashboard') {
    document.getElementById('nav-link-dashboard')?.classList.add('active');
  } else if (currentPage === 'login') {
    document.getElementById('nav-link-login')?.classList.add('active');
  }
  updateAuthUI();
}

function updateAuthUI() {
  const profileDiv = document.getElementById('nav-profile');
  const mobProfile = document.getElementById('mobile-profile');
  const loginLinks  = [document.getElementById('nav-link-login'), document.getElementById('mobile-nav-login')];
  const dashLinks   = [document.getElementById('nav-link-dashboard'), document.getElementById('mobile-nav-dashboard')];
  
  if (currentUser) {
    loginLinks.forEach(el => el && (el.style.display = 'none'));
    if (profileDiv) profileDiv.style.display = 'flex';
    if (mobProfile) mobProfile.style.display = 'flex';
    document.getElementById('nav-user-name').textContent = currentUser.name;
    
    if (currentUser.role === 'organizer') {
      dashLinks.forEach(el => el && (el.style.display = 'block'));
    } else {
      dashLinks.forEach(el => el && (el.style.display = 'none'));
    }
  } else {
    loginLinks.forEach(el => el && (el.style.display = 'block'));
    if (profileDiv) profileDiv.style.display = 'none';
    if (mobProfile) mobProfile.style.display = 'none';
    dashLinks.forEach(el => el && (el.style.display = 'none'));
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
    case 'login':     app.innerHTML = renderLogin(); break;
    default:          app.innerHTML = renderHome();
  }
  attachPageEvents();
}

// ===== NAVBAR EVENTS =====
document.getElementById('nav-home-link').addEventListener('click', e => { e.preventDefault(); navigate('home'); });
document.getElementById('nav-link-home').addEventListener('click', e => { e.preventDefault(); navigate('home'); });
document.getElementById('nav-link-dashboard').addEventListener('click', e => { e.preventDefault(); navigate('dashboard'); });
document.getElementById('nav-link-login').addEventListener('click', e => { e.preventDefault(); navigate('login'); });
document.getElementById('mobile-nav-home').addEventListener('click', e => { e.preventDefault(); closeMobileMenu(); navigate('home'); });
document.getElementById('mobile-nav-dashboard').addEventListener('click', e => { e.preventDefault(); closeMobileMenu(); navigate('dashboard'); });
document.getElementById('mobile-nav-login').addEventListener('click', e => { e.preventDefault(); closeMobileMenu(); navigate('login'); });

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
          <span class="event-category-badge tag-all" style="background:var(--bg-glass-hover)">${event.eventType === 'team' ? `👥 Team (${event.teamSize})` : '👤 Solo'}</span>
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
                    <td>${r.type === 'team' ? `${r.leader?.name} <span class="event-category-badge tag-all" style="font-size:0.65rem;padding:2px 6px">+${r.members?.length}👥</span>` : r.name}</td>
                    <td>${r.type === 'team' ? r.leader?.email : r.email}</td>
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
            ${open ? (event.eventType === 'team' ? '📝 Team Registration →' : '📝 Register Now →') : '🔒 Registration Closed'}
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

// ===== COUNTDOWN TIMER =====
function startCountdown(eventId) {
  if (_countdownInterval) { clearInterval(_countdownInterval); _countdownInterval = null; }

  const event = getEventById(eventId);
  if (!event) return;

  const cdD = document.getElementById('cd-d');
  const cdH = document.getElementById('cd-h');
  const cdM = document.getElementById('cd-m');
  const cdS = document.getElementById('cd-s');
  if (!cdD) return; // no timer elements (closed status)

  function tick() {
    const now    = new Date();
    const end    = new Date(event.registrationEnd);
    const start  = new Date(event.registrationStart);
    const status = getEventStatus(event);

    const target = status.key === 'live' ? end : start;
    const diff   = target - now;

    if (diff <= 0 || status.key === 'closed') {
      clearInterval(_countdownInterval);
      _countdownInterval = null;
      if (currentPage === 'event' && currentEventId === eventId) renderPage();
      return;
    }

    const totalSec = Math.floor(diff / 1000);
    const days  = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins  = Math.floor((totalSec % 3600) / 60);
    const secs  = totalSec % 60;
    const pad   = n => String(n).padStart(2, '0');

    if (cdD) cdD.textContent = pad(days);
    if (cdH) cdH.textContent = pad(hours);
    if (cdM) cdM.textContent = pad(mins);
    if (cdS) cdS.textContent = pad(secs);
  }

  tick();
  _countdownInterval = setInterval(tick, 1000);
}

// ===== REGISTRATION FORM PAGE =====
const PROFILE_KEY = 'es_user_profile';

function _loadSavedProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null'); }
  catch { return null; }
}

function _saveProfile(data) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(data)); } catch {}
}

function renderRegisterPage() {
  const event    = getEventById(currentEventId);
  const platform = getPlatformById(event?.platformId || currentPlatformId);
  if (!event) return '<div class="section"><p>Event not found.</p></div>';

  const status = getEventStatus(event);
  if (status.key !== 'live') {
    return `<div class="section" style="text-align:center;padding:80px 24px">
      <div style="font-size:2.5rem;margin-bottom:16px">🔒</div>
      <h2 style="margin-bottom:10px">Registration ${status.key === 'soon' ? 'Not Yet Open' : 'Closed'}</h2>
      <p style="color:var(--text-muted);margin-bottom:24px">This event is ${status.label.toLowerCase()}.</p>
      <button class="btn btn-primary" onclick="navigate('event',{eventId:'${event.id}',platformId:'${platform?.id}'})">← Back to Event</button>
    </div>`;
  }

  const saved = _loadSavedProfile();

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
      <!-- Event summary mini-card -->
      <div class="reg-event-summary">
        <span class="event-category-badge ${catBadgeClass(event.category)}" style="font-size:0.7rem">${catIcon(event.category)} ${event.category}</span>
        <div class="reg-event-summary-info">
          <div class="reg-event-title">${event.title}</div>
          <div class="reg-event-meta">${platform?.name} · Closes ${formatDate(event.registrationEnd)}</div>
        </div>
        <span class="edp-status-pill edp-status-${status.key}" style="margin-left:auto;flex-shrink:0">
          <span class="edp-status-dot"></span>${status.label}
        </span>
      </div>

      <!-- Main form card -->
      <div class="form-card" id="reg-form-card">
        <h1 class="form-title">Register for Event</h1>
        <p class="form-sub">Fill in your details and upload payment proof to secure your spot.</p>

        ${saved ? `<div class="autofill-banner" id="autofill-banner">
          <span>✨ We remembered your details! <a href="#" onclick="clearAutofill();return false;">Clear</a></span>
        </div>` : ''}

        <form id="reg-form" novalidate>

          ${event.eventType === 'team' ? `<h2 style="font-size:1.1rem;margin:16px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border)">Team Leader</h2>` : ''}
          <!-- Name row -->
          <div class="form-row" id="leader-fields">
            <div class="form-group" id="grp-firstname">
              <label class="form-label" for="firstname">First Name *</label>
              <input class="form-control" id="firstname" type="text" placeholder="Arjun"
                value="${saved?.firstName || ''}" autocomplete="given-name" />
              <div class="form-error" id="err-firstname">Please enter your first name.</div>
            </div>
            <div class="form-group" id="grp-lastname">
              <label class="form-label" for="lastname">Last Name *</label>
              <input class="form-control" id="lastname" type="text" placeholder="Mehta"
                value="${saved?.lastName || ''}" autocomplete="family-name" />
              <div class="form-error" id="err-lastname">Please enter your last name.</div>
            </div>
          </div>

          <!-- Email -->
          <div class="form-group" id="grp-email">
            <label class="form-label" for="email">Email Address *</label>
            <input class="form-control" id="email" type="email" placeholder="you@example.com"
              value="${saved?.email || ''}" autocomplete="email" />
            <div class="form-error" id="err-email">Please enter a valid email address.</div>
          </div>

          <!-- Phone -->
          <div class="form-group" id="grp-phone">
            <label class="form-label" for="phone">Phone Number *</label>
            <div class="input-with-prefix">
              <span class="input-prefix">🇮🇳 +91</span>
              <input class="form-control" id="phone" type="tel" placeholder="9876543210" maxlength="10"
                value="${saved?.phone || ''}" autocomplete="tel-national" />
            </div>
            <div class="form-error" id="err-phone">Please enter a valid 10-digit phone number.</div>
          </div>

          <!-- TEAM MEMBERS SECTION (ONLY IF TEAM) -->
          ${event.eventType === 'team' ? `
            <h2 style="font-size:1.1rem;margin:32px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--border)">Team Members</h2>
            ${Array.from({ length: (event.teamSize || 2) - 1 }).map((_, i) => `
              <div class="form-group" style="margin-bottom:16px;background:var(--bg-glass-hover);padding:16px;border-radius:var(--radius-sm)">
                <h3 style="font-size:0.95rem;margin-bottom:12px;color:var(--text-muted)">Member ${i + 1}</h3>
                <div class="form-row">
                  <div class="form-group" style="width:100%" id="grp-member-${i}-name">
                    <label class="form-label">Name *</label>
                    <input class="form-control team-member-name" data-index="${i}" type="text" placeholder="Member Name" />
                    <div class="form-error">Required.</div>
                  </div>
                  <div class="form-group" style="width:100%" id="grp-member-${i}-phone">
                    <label class="form-label">Phone *</label>
                    <input class="form-control team-member-phone" data-index="${i}" type="tel" placeholder="10-digit number" maxlength="10" />
                    <div class="form-error">Invalid phone.</div>
                  </div>
                </div>
              </div>
            `).join('')}
          ` : ''}

          <!-- Payment screenshot upload -->
          <div class="form-group" id="grp-payment">
            <label class="form-label" for="payment">Payment Screenshot *</label>
            <div class="file-upload-zone" id="file-zone" onclick="document.getElementById('payment').click()">
              <div class="file-upload-icon">📸</div>
              <div class="file-upload-text" id="file-label">Click to upload or drag & drop</div>
              <div class="file-upload-hint">PNG, JPG or PDF · Max 5 MB</div>
              <input type="file" id="payment" accept="image/*,.pdf"
                style="display:none" onchange="handleFileSelect(this)" />
            </div>
            <div class="form-error" id="err-payment">Please upload your payment screenshot.</div>
          </div>

          <!-- Terms -->
          <div class="form-group" id="grp-terms">
            <label class="form-check">
              <input type="checkbox" id="terms" />
              <span class="form-check-label">I confirm the payment is complete and agree to the
                <a href="#" onclick="return false">Terms &amp; Conditions</a>.</span>
            </label>
            <div class="form-error" id="err-terms">You must confirm before registering.</div>
          </div>

          <button type="submit" class="btn btn-primary" id="submit-btn">
            🎉 Complete Registration
          </button>
          <button type="button" class="btn btn-outline" style="margin-top:10px"
            onclick="navigate('event',{eventId:'${event.id}',platformId:'${platform?.id}'})">← Cancel</button>

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
  const allEvents      = events;
  const totalRegs      = getTotalRegistrations();
  const totalEvents    = allEvents.length;
  const openEvents     = allEvents.filter(e => getEventStatus(e).key === 'live').length;
  const totalPlatforms = platforms.length;

  // Category counts
  const techCount     = allEvents.filter(e => e.category === 'Tech').length;
  const sportsCount   = allEvents.filter(e => e.category === 'Sports').length;
  const culturalCount = allEvents.filter(e => e.category === 'Cultural').length;
  const total         = techCount + sportsCount + culturalCount;

  // Platform stats (spread so .name, .icon, .colorA, .colorB etc are available)
  const platformStats = platforms.map(p => ({
    ...p,
    evList: getEventsByPlatform(p.id),
    regs:   getEventsByPlatform(p.id).reduce((s, ev) => s + ev.registrations.length, 0),
  }));
  const maxRegs = Math.max(...platformStats.map(p => p.regs), 1);

  return `
  <div class="page">
    <div class="dashboard-page">

      <!-- Header -->
      <div class="dashboard-header fade-in">
        <div>
          <h1 class="dashboard-title">📊 Organizer Dashboard</h1>
          <p class="dashboard-sub">Manage events, view registrations, and track performance</p>
        </div>
        <button class="btn btn-primary dash-create-btn" onclick="openCreateEventPanel()">
          ＋ Create Event
        </button>
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
          <div class="stat-card-change up">↑ ${openEvents} live now</div>
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
                  <div class="bar-fill" style="width:${Math.round((p.regs/maxRegs)*100)}%;background:linear-gradient(90deg,${p.colorA},${p.colorB})"></div>
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
                { count: techCount,     color: '#6366f1', label: 'Tech'     },
                { count: sportsCount,   color: '#10b981', label: 'Sports'   },
                { count: culturalCount, color: '#f59e0b', label: 'Cultural' }
              ], total)}
            </svg>
            <div class="donut-legend">
              <div class="legend-item"><div class="legend-dot" style="background:#6366f1"></div><span class="legend-label">Tech</span><span class="legend-val">${techCount}</span></div>
              <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div><span class="legend-label">Sports</span><span class="legend-val">${sportsCount}</span></div>
              <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div><span class="legend-label">Cultural</span><span class="legend-val">${culturalCount}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- EVENTS BY PLATFORM ACCORDION -->
      <div class="dash-events-section fade-up-3">
        <div class="dash-section-header">
          <h2 class="dash-section-title">📋 Events &amp; Registrations</h2>
          <span class="dash-section-sub">${totalEvents} events across ${totalPlatforms} platforms</span>
        </div>

        ${platformStats.map(p => `
        <div class="dash-platform-block" id="dblock-${p.id}">
          <div class="dash-platform-row" onclick="togglePlatformBlock('${p.id}')">
            <div class="dash-pl-left">
              <span class="dash-pl-icon" style="background:linear-gradient(135deg,${p.colorA},${p.colorB})">${p.icon}</span>
              <div>
                <div class="dash-pl-name">${p.name}</div>
                <div class="dash-pl-meta">${p.categories.map(c => `<span class="tag tag-${c.toLowerCase()}">${c}</span>`).join('')}</div>
              </div>
            </div>
            <div class="dash-pl-right">
              <span class="dash-pl-stat"><strong>${p.evList.length}</strong> events</span>
              <span class="dash-pl-stat"><strong>${p.regs}</strong> registrations</span>
              <button class="btn btn-outline btn-sm"
                onclick="event.stopPropagation();navigate('platform',{platformId:'${p.id}'})">View →</button>
              <span class="dash-pl-chevron" id="chev-${p.id}">▼</span>
            </div>
          </div>

          <div class="dash-platform-body" id="dbody-${p.id}" style="display:none">
            ${p.evList.length === 0
              ? `<div class="dash-empty">No events yet.
                   <button class="btn-link" onclick="openCreateEventPanel('${p.id}')">Create one →</button>
                 </div>`
              : p.evList.map(ev => {
                  const st  = getEventStatus(ev);
                  const pct = ev.maxSpots ? Math.round((ev.filledSpots / ev.maxSpots) * 100) : 0;
                  return `
                <div class="dash-event-block">
                  <div class="dash-event-header">
                    <div class="dash-event-header-left">
                      <span class="event-category-badge ${catBadgeClass(ev.category)}">${catIcon(ev.category)} ${ev.category}</span>
                      <span class="event-category-badge tag-all" style="background:var(--bg-glass-hover)">${ev.eventType === 'team' ? `👥 Team (${ev.teamSize})` : '👤 Solo'}</span>
                      <span class="edp-status-pill edp-status-${st.key}"><span class="edp-status-dot"></span>${st.label}</span>
                    </div>
                    <div class="dash-event-meta">
                      <h3 class="dash-event-title">${ev.title}</h3>
                      <div class="dash-event-dates">
                        <span>📅 Opens ${formatDate(ev.registrationStart)}</span>
                        <span>⏰ Closes ${formatDate(ev.registrationEnd)}</span>
                        <span>👥 ${ev.registrations.length}${ev.maxSpots ? '/'+ev.maxSpots : ''} registered (${pct}%)</span>
                      </div>
                      <div class="dash-cap-bar-track">
                        <div class="dash-cap-bar-fill"
                          style="width:${pct}%;background:linear-gradient(90deg,${pct>=90?'var(--danger),#f87171':'var(--success),var(--accent)'})">
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="table-wrapper dash-participants-table">
                    ${ev.registrations.length === 0
                      ? `<div class="dash-empty">No registrations yet for this event.</div>`
                      : `<table>
                          <thead><tr>
                            <th>#</th><th>Name</th><th>Email</th><th>Phone</th>
                            <th>Payment File</th><th>Date</th><th>Status</th>
                          </tr></thead>
                          <tbody>
                          ${ev.registrations.map((r,i) => `
                            <tr>
                              <td style="color:var(--text-faint)">${i+1}</td>
                              <td><strong>${r.type === 'team' ? `${r.leader?.name} <span class="event-category-badge tag-all" style="font-size:0.65rem;padding:2px 6px">+${r.members?.length}👥</span>` : r.name}</strong></td>
                              <td style="color:var(--text-faint)">${r.type === 'team' ? r.leader?.email : r.email}</td>
                              <td>${(r.type === 'team' ? r.leader?.phone : r.phone) || '—'}</td>
                              <td style="color:var(--text-faint);font-size:0.75rem">${r.paymentFile || '—'}</td>
                              <td>${formatDate(r.date)}</td>
                              <td><span class="status-badge status-${r.status}">${r.status}</span></td>
                            </tr>`).join('')}
                          </tbody>
                        </table>`
                    }
                  </div>
                </div>`;
                }).join('')
            }
          </div>
        </div>`).join('')}
      </div>

    </div>

    <!-- CREATE EVENT SLIDE-IN PANEL -->
    <div class="dash-panel-overlay" id="dash-panel-overlay"
      onclick="closeCreateEventPanel()" style="display:none"></div>
    <div class="dash-panel" id="dash-panel" style="transform:translateX(100%)">
      <div class="dash-panel-header">
        <h2 class="dash-panel-title">➕ Create New Event</h2>
        <button class="dash-panel-close" onclick="closeCreateEventPanel()">✕</button>
      </div>
      <div class="dash-panel-body">
        <form id="create-event-form" novalidate onsubmit="handleCreateEventSubmit(event)">

          <div class="form-group" id="ce-grp-platform">
            <label class="form-label" for="ce-platform">Platform *</label>
            <select class="form-select" id="ce-platform">
              <option value="">Select platform…</option>
              ${platforms.map(p => `<option value="${p.id}">${p.icon} ${p.name}</option>`).join('')}
            </select>
            <div class="form-error" id="ce-err-platform">Please select a platform.</div>
          </div>

          <div class="form-group" id="ce-grp-title">
            <label class="form-label" for="ce-title">Event Title *</label>
            <input class="form-control" id="ce-title" type="text" placeholder="e.g. React Bootcamp 2026" />
            <div class="form-error" id="ce-err-title">Please enter a title.</div>
          </div>

          <div class="form-group" id="ce-grp-category">
            <label class="form-label" for="ce-category">Category *</label>
            <select class="form-select" id="ce-category">
              <option value="">Select category…</option>
              <option value="Tech">⚡ Tech</option>
              <option value="Sports">🏃 Sports</option>
              <option value="Cultural">🎨 Cultural</option>
            </select>
            <div class="form-error" id="ce-err-category">Please select a category.</div>
          </div>

          <div class="form-row">
            <div class="form-group" id="ce-grp-type">
              <label class="form-label" for="ce-type">Event Type *</label>
              <select class="form-select" id="ce-type" onchange="document.getElementById('ce-grp-size').style.display = this.value === 'team' ? 'block' : 'none'">
                <option value="solo" selected>Solo</option>
                <option value="team">Team</option>
              </select>
            </div>
            <div class="form-group" id="ce-grp-size" style="display:none">
              <label class="form-label" for="ce-size">Team Size (Max)</label>
              <input class="form-control" id="ce-size" type="number" min="2" max="5" value="4" />
            </div>
          </div>

          <div class="form-group" id="ce-grp-desc">
            <label class="form-label" for="ce-desc">Description *</label>
            <textarea class="form-control" id="ce-desc" rows="3"
              placeholder="Describe your event…"></textarea>
            <div class="form-error" id="ce-err-desc">Please add a description.</div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="ce-max">Max Capacity</label>
              <input class="form-control" id="ce-max" type="number" min="1" placeholder="100" value="100" />
            </div>
            <div class="form-group">
              <label class="form-label" for="ce-vis">Visibility</label>
              <select class="form-select" id="ce-vis">
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" id="ce-grp-start">
              <label class="form-label" for="ce-start">Registration Opens *</label>
              <input class="form-control" id="ce-start" type="datetime-local" />
              <div class="form-error" id="ce-err-start">Required.</div>
            </div>
            <div class="form-group" id="ce-grp-end">
              <label class="form-label" for="ce-end">Registration Closes *</label>
              <input class="form-control" id="ce-end" type="datetime-local" />
              <div class="form-error" id="ce-err-end">Required.</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="ce-wa">WhatsApp Group Link</label>
            <div class="input-with-prefix">
              <span class="input-prefix">💬</span>
              <input class="form-control" id="ce-wa" type="url"
                placeholder="https://chat.whatsapp.com/…" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="ce-qr">QR Code Image URL</label>
            <input class="form-control" id="ce-qr" type="url"
              placeholder="https://example.com/qr.png" />
            <div style="font-size:0.72rem;color:var(--text-faint);margin-top:4px">
              Paste a direct image URL (leave blank for default)
            </div>
          </div>

          <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">
            🚀 Create Event
          </button>
        </form>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-brand">⚡ EventSphere</div>
      <p>© 2026 EventSphere. All rights reserved.</p>
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

// ───────────────────────────────────────────────────────────────────────────
// DASHBOARD HELPERS
// ───────────────────────────────────────────────────────────────────────────

/** Toggle a platform accordion open/closed */
function togglePlatformBlock(platformId) {
  const body = document.getElementById(`dbody-${platformId}`);
  const chev = document.getElementById(`chev-${platformId}`);
  if (!body) return;
  const opening = body.style.display === 'none';
  body.style.display = opening ? 'block' : 'none';
  if (chev) chev.textContent = opening ? '▲' : '▼';
}

/** Open the Create Event slide-in panel (optionally pre-select a platform) */
function openCreateEventPanel(presetPlatformId) {
  const overlay = document.getElementById('dash-panel-overlay');
  const panel   = document.getElementById('dash-panel');
  if (overlay) overlay.style.display = 'block';
  if (panel)   panel.style.transform  = 'translateX(0)';
  if (presetPlatformId) {
    const sel = document.getElementById('ce-platform');
    if (sel) sel.value = presetPlatformId;
  }
}

function closeCreateEventPanel() {
  const overlay = document.getElementById('dash-panel-overlay');
  const panel   = document.getElementById('dash-panel');
  if (panel)   panel.style.transform = 'translateX(100%)';
  if (overlay) overlay.style.display = 'none';
}

/** Create Event form submission */
function handleCreateEventSubmit(e) {
  e.preventDefault();
  let valid = true;

  const required = [
    { id: 'ce-platform',  grp: 'ce-grp-platform',  check: v => v !== '' },
    { id: 'ce-title',     grp: 'ce-grp-title',     check: v => v.trim().length > 1 },
    { id: 'ce-category',  grp: 'ce-grp-category',  check: v => v !== '' },
    { id: 'ce-desc',      grp: 'ce-grp-desc',      check: v => v.trim().length > 5 },
    { id: 'ce-start',     grp: 'ce-grp-start',     check: v => v !== '' },
    { id: 'ce-end',       grp: 'ce-grp-end',       check: v => v !== '' },
  ];

  required.forEach(f => {
    const el  = document.getElementById(f.id);
    const grp = document.getElementById(f.grp);
    if (el && grp) {
      if (!f.check(el.value)) { grp.classList.add('error'); valid = false; }
      else                     { grp.classList.remove('error'); }
    }
  });

  if (!valid) return;

  // Date order check
  const startVal = document.getElementById('ce-start').value;
  const endVal   = document.getElementById('ce-end').value;
  if (new Date(endVal) <= new Date(startVal)) {
    const eg = document.getElementById('ce-grp-end');
    const ee = document.getElementById('ce-err-end');
    if (eg) eg.classList.add('error');
    if (ee) ee.textContent = 'End must be after start.';
    return;
  }

  const platformId = document.getElementById('ce-platform').value;
  const eventType = document.getElementById('ce-type').value;
  const teamSize = eventType === 'team' ? (parseInt(document.getElementById('ce-size').value, 10) || 4) : 1;

  // Store.addEvent(platformId, eventData) — 2-arg API
  const result = Store.addEvent(platformId, {
    title:             document.getElementById('ce-title').value.trim(),
    category:          document.getElementById('ce-category').value,
    description:       document.getElementById('ce-desc').value.trim(),
    registrationStart: startVal,
    registrationEnd:   endVal,
    eventType:         eventType,
    teamSize:          teamSize,
    whatsappLink:      document.getElementById('ce-wa').value.trim() || '',
    qr:                document.getElementById('ce-qr').value.trim() || 'qr_sample.png',
    maxSpots:          parseInt(document.getElementById('ce-max').value, 10) || 100,
    visibility:        document.getElementById('ce-vis').value,
  });

  if (!result || !result.ok) {
    showToast(`⚠️ ${result?.error || 'Could not create event.'}`);
    return;
  }

  closeCreateEventPanel();
  showToast(`✅ "${result.event.title}" created!`);

  // Notify the organizer
  NotifStore.push({
    type:    'event_updated',
    title:   'Event Created 📝',
    message: `"${result.event.title}" has been added successfully.`,
    eventId: result.event.id,
  });

  // Re-render and auto-open the platform accordion
  renderPage();
  setTimeout(() => {
    const body = document.getElementById(`dbody-${platformId}`);
    if (body && body.style.display === 'none') togglePlatformBlock(platformId);
    document.getElementById(`dblock-${platformId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}


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
  
  const event = getEventById(currentEventId);
  if (!event) return;

  // Core field validation
  const fields = [
    { id: 'firstname', grp: 'grp-firstname', validate: v => v.trim().length > 0 },
    { id: 'lastname',  grp: 'grp-lastname',  validate: v => v.trim().length > 0 },
    { id: 'email',     grp: 'grp-email',     validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
    { id: 'phone',     grp: 'grp-phone',     validate: v => /^\d{10}$/.test(v) },
  ];

  fields.forEach(f => {
    const el  = document.getElementById(f.id);
    const grp = document.getElementById(f.grp);
    if (el && grp) {
      if (!f.validate(el.value)) { grp.classList.add('error'); valid = false; }
      else                        { grp.classList.remove('error'); }
    }
  });

  // Team Member validation
  const membersData = [];
  if (event.eventType === 'team') {
    const memCount = (event.teamSize || 2) - 1;
    for (let i = 0; i < memCount; i++) {
      const nameEl  = document.querySelector(`.team-member-name[data-index="${i}"]`);
      const phoneEl = document.querySelector(`.team-member-phone[data-index="${i}"]`);
      const grpName = document.getElementById(`grp-member-${i}-name`);
      const grpPhone = document.getElementById(`grp-member-${i}-phone`);
      
      let memValid = true;
      const memName = nameEl?.value.trim();
      const memPhone = phoneEl?.value.trim();
      
      if (!memName)  { grpName?.classList.add('error'); valid = false; memValid = false; }
      else           { grpName?.classList.remove('error'); }
      
      if (!/^\\d{10}$/.test(memPhone || '')) { grpPhone?.classList.add('error'); valid = false; memValid = false; }
      else                                 { grpPhone?.classList.remove('error'); }

      if (memValid) {
        membersData.push({ name: memName, phone: memPhone });
      }
    }
  }

  // Payment screenshot validation
  const paymentInput = document.getElementById('payment');
  const paymentGrp   = document.getElementById('grp-payment');
  const hasFile = paymentInput?.files?.length > 0;
  if (paymentGrp) {
    if (!hasFile) { paymentGrp.classList.add('error'); valid = false; }
    else          { paymentGrp.classList.remove('error'); }
  }

  // Terms checkbox
  const terms    = document.getElementById('terms');
  const termsGrp = document.getElementById('grp-terms');
  if (terms && !terms.checked) { termsGrp?.classList.add('error'); valid = false; }
  else if (terms)              { termsGrp?.classList.remove('error'); }

  if (!valid) return;

  // Build registration payload
  const firstName = document.getElementById('firstname').value.trim();
  const lastName  = document.getElementById('lastname').value.trim();
  const email     = document.getElementById('email').value.trim();
  const phone     = document.getElementById('phone').value.trim();
  const fileName  = paymentInput?.files?.[0]?.name || '';

  // ── Autofill save ───────────────────────────────────────────────────────────
  _saveProfile({ firstName, lastName, email, phone });

  // ── Persist registration via Store ──────────────────────────────────────────
  
  let payloadStr = {};
  if (event.eventType === 'team') {
    payloadStr = {
      type: 'team',
      leader: { name: `${firstName} ${lastName}`, email, phone },
      members: membersData,
      userMobile: currentUser?.mobile || phone,
      paymentFile: fileName,
      status: 'Pending',
    };
  } else {
    payloadStr = {
      type: 'solo',
      name: `${firstName} ${lastName}`,
      email,
      phone,
      userMobile: currentUser?.mobile || phone,
      paymentFile: fileName,
      status: 'Pending',
    };
  }

  const result = Store.registerUser(currentEventId, payloadStr);

  if (!result.ok) {
    showToast(`⚠️ ${result.error}`);
    return;
  }

  // ── Notification: registration confirmed ────────────────────────────────────
  const platform = getPlatformById(event?.platformId || currentPlatformId);

  NotifStore.push({
    type:    'registration',
    title:   'Registration Successful! 🎉',
    message: `You're registered for "${event?.title || 'the event'}". Check WhatsApp for updates.`,
    eventId: currentEventId,
  });

  // Browser push notification
  showBrowserNotification(
    'Registration Confirmed ✅',
    `You're in for "${event?.title || 'the event'}"! See you there.`,
    { tag: `reg-${currentEventId}` }
  );

  // ── Show success screen ──────────────────────────────────────────────────────
  showSuccessScreen(event?.whatsappLink, currentEventId, platform?.id || currentPlatformId);
}

// ===== FIREBASE AUTH & LOGIN FLOW =====

function renderLogin() {
  return `
    <section class="page container" style="display:flex; justify-content:center; align-items:center; min-height:80vh">
      <div class="card" style="width:100%; max-width:400px; padding:32px;">
        <h2 style="margin-bottom:8px">Welcome to EventSphere</h2>
        <p class="text-muted" style="margin-bottom:24px">Enter your mobile number to continue.</p>
        
        <form onsubmit="attemptLogin(event)">
          <div class="form-group">
            <label>Mobile Number</label>
            <input type="tel" id="log-mobile" class="input" placeholder="e.g. 9876543210" required pattern="[0-9]{10}" />
          </div>
          
          <div class="form-group">
            <label>I am a...</label>
            <select id="log-role" class="input">
              <option value="student">Student / Participant</option>
              <option value="organizer">Event Organizer</option>
            </select>
          </div>

          <div class="form-group" id="log-name-group" style="display:none; animation: pageFadeIn 0.3s ease;">
            <label>We don't recognize this number. What's your name?</label>
            <input type="text" id="log-name" class="input" placeholder="Your full name" />
          </div>

          <button type="submit" class="btn btn-primary" id="log-btn" style="width:100%; margin-top:8px">Continue</button>
        </form>
      </div>
    </section>
  `;
}

async function attemptLogin(e) {
  e.preventDefault();
  const mobile = document.getElementById('log-mobile').value.trim();
  const role   = document.getElementById('log-role').value;
  const btn    = document.getElementById('log-btn');
  const nameGrp = document.getElementById('log-name-group');
  
  // Wait for Firebase to be ready if it's lagging
  if (!window.FirebaseStore) {
    showToast('Firebase is initializing, please wait...');
    return;
  }

  btn.textContent = 'Checking...';
  btn.disabled = true;

  if (nameGrp.style.display === 'block') {
    // Phase 2: Create user
    const name = document.getElementById('log-name').value.trim();
    if (!name) { 
      showToast('Please enter your name'); 
      btn.textContent = 'Continue'; btn.disabled = false; return; 
    }
    
    // Create Document in Firestore
    const user = await window.FirebaseStore.createUser(mobile, role, name);
    if (user) finishLogin(user);
    else {
      showToast('Error registering user.');
      btn.textContent = 'Continue'; btn.disabled = false;
    }
    return;
  }

  // Phase 1: Check existing user
  const user = await window.FirebaseStore.getUser(mobile);
  
  if (user) {
    // User exists - check role
    if (user.role !== role) {
      showToast(`This number is already registered as an ${user.role}.`);
      btn.textContent = 'Continue'; btn.disabled = false;
    } else {
      finishLogin(user);
    }
  } else {
    // Not found - Slide down the name field
    nameGrp.style.display = 'block';
    btn.textContent = 'Complete Registration';
    btn.disabled = false;
  }
}

function finishLogin(user) {
  currentUser = user;
  localStorage.setItem('es_user', JSON.stringify(user));
  updateAuthUI();
  navigate(user.role === 'organizer' ? 'dashboard' : 'home');
  showToast(`Welcome, ${user.name}! 🎉`);
}

function logoutUser() {
  currentUser = null;
  localStorage.removeItem('es_user');
  updateAuthUI();
  navigate('login');
  showToast('Logged out successfully.');
}

async function editUserName() {
  if (!currentUser) return;
  const newName = prompt('Enter your new name:', currentUser.name);
  if (newName && newName.trim() !== currentUser.name) {
    
    // Optimistic UI Update might be nice, but we'll wait for DB
    const success = await window.FirebaseStore.updateName(currentUser.mobile, newName.trim());
    if (success) {
      currentUser.name = newName.trim();
      localStorage.setItem('es_user', JSON.stringify(currentUser));
      updateAuthUI(); // reflects new name instantly
      showToast('Name updated successfully!');
    } else {
      showToast('Failed to connect to Firebase.');
    }
  }
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
requestBrowserNotifPermission(); // ask for browser notification permission

// ── Restore State from URL or LocalStorage ──────────────────────────────────
const params = new URLSearchParams(window.location.search);
const initPage = params.get('page') || localStorage.getItem('es_currentPage') || 'home';
const initPl = params.get('pl') || localStorage.getItem('es_currentPlatformId') || null;
const initEv = params.get('ev') || localStorage.getItem('es_currentEventId') || null;

// Replace the initial history state so the first back button logic works correctly
let initUrl = "?page=" + initPage;
if (initPl) initUrl += "&pl=" + initPl;
if (initEv) initUrl += "&ev=" + initEv;
window.history.replaceState({ page: initPage, platformId: initPl, eventId: initEv }, "", initUrl);

navigate(initPage, { platformId: initPl, eventId: initEv }, true);

NotifStore._updateBadge();      // restore badge from localStorage on load
renderNotifPanel();             // populate panel with any stored notifications
checkEventAlerts();             // queue smart event alerts
