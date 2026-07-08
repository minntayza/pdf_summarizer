// shared-ui.js — Injects shared UI components (top navigation bar) into every page
// Eliminates duplicated nav markup across all HTML files.

// ── Navigation Bar ──────────────────────────────────────
export function injectControlBar() {
  const target = document.getElementById('control-bar-target');
  if (!target) return;

  const navLinks = `
    <a href="library.html" class="nav-link" data-nav="library" data-i18n="library">Library</a>
    <a href="upload.html" class="nav-link" data-nav="upload" data-i18n="uploadNewPDF">Upload</a>
    <a href="review.html" class="nav-link" data-nav="review" data-i18n="review">Review</a>
    <a href="rooms.html" class="nav-link" data-nav="rooms" data-i18n="studyRooms">Rooms</a>
  `;

  target.innerHTML = `
    <div class="nav-left">
      <a href="library.html" class="logo-link">Smart<span class="logo-accent">PDF</span></a>
      <div class="nav-links">
        ${navLinks}
      </div>
    </div>
    <button class="nav-toggle" id="nav-toggle" aria-label="Toggle navigation">
      <span></span><span></span><span></span>
    </button>
    <div class="nav-right">
      <span class="streak-badge" id="streak-display"></span>
      <button class="icon-btn font-size-btn" id="font-size-btn" aria-label="Adjust font size" title="Font size">Aa</button>
      <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme" title="Theme">
        <svg id="theme-icon-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg id="theme-icon-light" class="theme-icon-hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </button>
      <button class="icon-btn" id="lang-toggle" title="Language"></button>
    </div>
  `;

  // Mobile nav drawer (appended inside the control bar target)
  const drawer = document.createElement('div');
  drawer.className = 'mobile-nav';
  drawer.id = 'mobile-nav';
  drawer.innerHTML = navLinks;
  target.appendChild(drawer);

  // Backdrop overlay
  const backdrop = document.createElement('div');
  backdrop.className = 'nav-backdrop';
  document.body.appendChild(backdrop);

  // Toggle logic
  const toggle = document.getElementById('nav-toggle');
  const close = () => {
    toggle?.classList.remove('open');
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  };
  const open = () => {
    toggle?.classList.add('open');
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  toggle?.addEventListener('click', () => {
    drawer.classList.contains('open') ? close() : open();
  });
  backdrop.addEventListener('click', close);
  drawer.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', close);
  });
}

// Highlight the active nav link based on current page
export function highlightNavLink() {
  const page = location.pathname.split('/').pop() || 'library.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === page);
  });
}
