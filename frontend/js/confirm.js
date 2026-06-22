// confirm.js — Lightweight confirm dialog (promise-based, keyboard accessible)
// Usage: import { confirm } from './confirm.js'; const ok = await confirm('Log out?');

let activeResolve = null;

export function confirm(message) {
  return new Promise((resolve) => {
    // If a dialog is already open, resolve it false and replace
    if (activeResolve) {
      activeResolve(false);
      removeOverlay();
    }
    activeResolve = resolve;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Confirm action');

    overlay.innerHTML = `
      <div class="confirm-card">
        <p class="confirm-msg">${message}</p>
        <div class="confirm-btns">
          <button class="confirm-cancel btn btn-ghost btn-sm">Cancel</button>
          <button class="confirm-ok btn btn-danger btn-sm">Confirm</button>
        </div>
      </div>
    `;

    const okBtn = overlay.querySelector('.confirm-ok');
    const cancelBtn = overlay.querySelector('.confirm-cancel');

    const cleanup = (result) => {
      if (activeResolve === resolve) activeResolve = null;
      resolve(result);
      removeOverlay();
    };

    okBtn.addEventListener('click', () => cleanup(true));
    cancelBtn.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });

    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(false); document.removeEventListener('keydown', onKey); }
      if (e.key === 'Enter') { e.preventDefault(); cleanup(true); document.removeEventListener('keydown', onKey); }
    });

    // Show with entrance animation
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    okBtn.focus();
  });
}

let overlayEl = null;

function removeOverlay() {
  if (!overlayEl) {
    // Find any overlay in the DOM (created by this module)
    overlayEl = document.querySelector('.confirm-overlay');
  }
  if (overlayEl) {
    overlayEl.classList.remove('show');
    overlayEl.addEventListener('transitionend', () => {
      if (overlayEl && overlayEl.parentNode) overlayEl.remove();
      overlayEl = null;
    }, { once: true });
    setTimeout(() => {
      if (overlayEl && overlayEl.parentNode) { overlayEl.remove(); overlayEl = null; }
    }, 400);
  }
  activeResolve = null;
}
