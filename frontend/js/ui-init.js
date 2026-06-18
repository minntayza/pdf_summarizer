// ui-init.js — Shared UI initialization: theme toggle, language toggle, font size
// Import this in every HTML page to eliminate duplicated boilerplate.

import { initFontSize, cycleFontSize } from './font-size.js';
import { t, getLang, setLang } from './i18n.js';

// ── Theme toggle ─────────────────────────────────────────
export function initTheme() {
  const body = document.body;
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const savedTheme = localStorage.getItem('theme') || 'light';
  body.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);

  toggle.addEventListener('click', () => {
    const cur = body.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeUI(next);
  });
}

function updateThemeUI(theme) {
  const darkIcon = document.getElementById('theme-icon-dark');
  const lightIcon = document.getElementById('theme-icon-light');
  if (darkIcon) darkIcon.style.display = theme === 'dark' ? '' : 'none';
  if (lightIcon) lightIcon.style.display = theme === 'light' ? '' : 'none';
}

// ── Font size ────────────────────────────────────────────
export function initFontSizeUI() {
  initFontSize();
  const btn = document.getElementById('font-size-btn');
  if (btn) btn.addEventListener('click', cycleFontSize);
}

// ── Language toggle ──────────────────────────────────────
export function initLang(onChange) {
  const langBtn = document.getElementById('lang-toggle');
  if (!langBtn) return;

  updateLangUI(langBtn);

  langBtn.addEventListener('click', () => {
    setLang(getLang() === 'en' ? 'mm' : 'en');
    updateLangUI(langBtn);
    if (onChange) onChange();
  });
}

function updateLangUI(btn) {
  btn.textContent = getLang() === 'en' ? 'မြန်မာ' : 'EN';
  document.documentElement.lang = getLang() === 'mm' ? 'my' : 'en';
}

// ── Render data-i18n elements ────────────────────────────
export function renderI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.tagName !== 'INPUT' || el.type !== 'submit') {
      el.textContent = t(el.getAttribute('data-i18n'));
    }
  });
}

// ── All-in-one init (call once per page) ─────────────────
export function initUI(onLangChange) {
  initFontSizeUI();
  initTheme();
  initLang(onLangChange || renderI18n);
}
