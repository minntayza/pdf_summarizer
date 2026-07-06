// shared-ui.js — Injects shared UI components (top navigation bar) into every page
// Eliminates duplicated nav markup across all HTML files.

// ── Navigation Bar ──────────────────────────────────────
export function injectControlBar() {
  const target = document.getElementById('control-bar-target');
  if (!target) return;

  target.innerHTML = `
    <div class="nav-left">
      <a href="library.html" class="logo-link">Smart<span class="logo-accent">PDF</span></a>
      <div class="nav-links">
        <a href="library.html" class="nav-link" data-nav="library" data-i18n="library">Library</a>
        <a href="upload.html" class="nav-link" data-nav="upload" data-i18n="uploadNewPDF">Upload</a>
        <a href="review.html" class="nav-link" data-nav="review" data-i18n="review">Review</a>
        <a href="rooms.html" class="nav-link" data-nav="rooms" data-i18n="studyRooms">Rooms</a>
      </div>
    </div>
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
}

// Highlight the active nav link based on current page
export function highlightNavLink() {
  const page = location.pathname.split('/').pop() || 'library.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === page);
  });
}
