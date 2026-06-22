// toast.js — Lightweight toast notification system
// Usage: import { toast } from './toast.js'; toast('message', 'error');

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    document.body.appendChild(container);
  }
  return container;
}

export function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;

  const icons = {
    error: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    success: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    info: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  };

  el.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  el.addEventListener('click', () => dismiss(el));

  getContainer().appendChild(el);

  // Entrance animation
  requestAnimationFrame(() => el.classList.add('show'));

  // Auto-dismiss after 4s
  el._timer = setTimeout(() => dismiss(el), 4000);
}

function dismiss(el) {
  if (el._dismissed) return;
  el._dismissed = true;
  clearTimeout(el._timer);
  el.classList.remove('show');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
  // Fallback if transitionend doesn't fire
  setTimeout(() => { if (el.parentNode) el.remove(); }, 400);
}
