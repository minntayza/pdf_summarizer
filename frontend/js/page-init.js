// page-init.js — Shared page initialization: auth check, control bar, UI setup
// Import in every HTML page to eliminate duplicated boilerplate.

import { sb } from './supabase-client.js';
import { getSession, getUser, redirectIfAuth } from './auth.js';
import { injectControlBar, highlightNavLink } from './shared-ui.js';
import { initUI, renderI18n } from './ui-init.js';
import { t } from './i18n.js';
import { confirm } from './confirm.js';
import { renderStreak } from './streak.js';

// ── Page Init ─────────────────────────────────────────────
// requireAuth: true  → protected pages (redirect to login if no session)
// requireAuth: false → login/signup pages (redirect to upload if already logged in)
// Returns { user, session } for pages that need them.
export async function initPage({ onLangChange, requireAuth = true }) {
  injectControlBar();
  renderStreak('streak-display');

  let session = null;
  let user = null;

  if (requireAuth) {
    const { session: sess, error } = await getSession();
    if (error) {
      // Network error — don't redirect, let page decide
      console.error('Auth check failed:', error);
    } else if (!sess) {
      window.location.href = 'index.html';
      return { session: null, user: null };
    } else {
      session = sess;
      const { user: u } = await getUser();
      user = u;
      const emailEl = document.getElementById('user-email');
      if (emailEl && user) emailEl.textContent = user.email;

      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          const ok = await confirm(t('logOut') + '?');
          if (ok) {
            await sb.auth.signOut();
            window.location.href = 'index.html';
          }
        });
      }
    }
  } else {
    // Login/signup: redirect away if already authenticated
    const redirected = await redirectIfAuth();
    if (redirected) return { session: null, user: null };
  }

  initUI(onLangChange || renderI18n);
  renderI18n();
  highlightNavLink();

  return { session, user };
}
