// ui-init.js — Shared UI initialization: theme toggle, language toggle, font size
// Import this in every HTML page to eliminate duplicated boilerplate.

import { initFontSize, cycleFontSize } from './font-size.js';
import { t, getLang, setLang } from './i18n.js';

// ── Theme toggle ─────────────────────────────────────────
export function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  const savedTheme = localStorage.getItem('theme');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeUI(theme);

  toggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeUI(next);
  });
}

function updateThemeUI(theme) {
  const darkIcon = document.getElementById('theme-icon-dark');
  const lightIcon = document.getElementById('theme-icon-light');
  if (darkIcon) darkIcon.classList.toggle('theme-icon-hidden', theme !== 'dark');
  if (lightIcon) lightIcon.classList.toggle('theme-icon-hidden', theme !== 'light');
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
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.getAttribute('data-i18n-title'));
  });
}

// ── Tabs — ARIA roles + keyboard navigation ─────────────
export function initTabs() {
  document.querySelectorAll('.tabs').forEach(list => {
    list.setAttribute('role', 'tablist');
    const tabs = list.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', tab.classList.contains('on'));
      const panelId = 'p-' + tab.dataset.panel;
      tab.setAttribute('aria-controls', panelId);
      tab.setAttribute('tabindex', tab.classList.contains('on') ? '0' : '-1');
      const panel = document.getElementById(panelId);
      if (panel) panel.setAttribute('role', 'tabpanel');
    });
    list.addEventListener('keydown', e => {
      const tabsArr = [...tabs];
      const idx = tabsArr.indexOf(document.activeElement);
      if (idx < 0) return;
      let next;
      if (e.key === 'ArrowRight') next = tabsArr[(idx + 1) % tabsArr.length];
      else if (e.key === 'ArrowLeft') next = tabsArr[(idx - 1 + tabsArr.length) % tabsArr.length];
      else if (e.key === 'Home') next = tabsArr[0];
      else if (e.key === 'End') next = tabsArr[tabsArr.length - 1];
      if (next) { next.focus(); next.click(); e.preventDefault(); }
    });
  });
}

export function switchTab(tab) {
  const list = tab.closest('.tabs');
  if (!list) return;
  list.querySelectorAll('.tab').forEach(t => {
    t.classList.remove('on');
    t.setAttribute('aria-selected', 'false');
    t.setAttribute('tabindex', '-1');
  });
  tab.classList.add('on');
  tab.setAttribute('aria-selected', 'true');
  tab.setAttribute('tabindex', '0');
  const panelId = 'p-' + tab.dataset.panel;
  tab.closest('.wrap').querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  document.getElementById(panelId)?.classList.add('on');
}

// ── All-in-one init (call once per page) ─────────────────
export function initUI(onLangChange) {
  initFontSizeUI();
  initTheme();
  initLang(onLangChange || renderI18n);
}
