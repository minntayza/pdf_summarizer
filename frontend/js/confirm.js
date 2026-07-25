// confirm.js — Lightweight confirm + prompt dialogs (promise-based, keyboard accessible)
// Usage: import { confirm } from './confirm.js'; const ok = await confirm('Log out?');
//        import { promptDialog } from './confirm.js'; const val = await promptDialog('Enter name:', 'default');

let activeResolve = null;
let overlayEl = null;

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

export function promptDialog(message, defaultValue = '') {
  return new Promise((resolve) => {
    if (activeResolve) {
      activeResolve(null);
      removeOverlay();
    }
    activeResolve = resolve;

    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', message);

    overlay.innerHTML = `
      <div class="confirm-card">
        <p class="confirm-msg">${message}</p>
        <div style="margin:0 0 20px">
          <input type="text" id="prompt-input" class="form-input" value="${defaultValue.replace(/"/g,'&quot;')}" autofocus style="font-size:1rem" />
        </div>
        <div class="confirm-btns">
          <button class="confirm-cancel btn btn-ghost btn-sm">Cancel</button>
          <button class="confirm-ok btn btn-accent btn-sm">Save</button>
        </div>
      </div>
    `;

    const input = overlay.querySelector('#prompt-input');
    const okBtn = overlay.querySelector('.confirm-ok');
    const cancelBtn = overlay.querySelector('.confirm-cancel');

    const cleanup = (result) => {
      if (activeResolve === resolve) activeResolve = null;
      resolve(result);
      removeOverlay();
    };

    okBtn.addEventListener('click', () => cleanup(input.value));
    cancelBtn.addEventListener('click', () => cleanup(null));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(null);
    });

    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); cleanup(null); document.removeEventListener('keydown', onKey); }
      if (e.key === 'Enter') { e.preventDefault(); cleanup(input.value); document.removeEventListener('keydown', onKey); }
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    input.focus();
    input.select();
  });
}

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
