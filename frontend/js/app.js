// app.js — Shared utilities for Smart PDF Summarizer

const APP = (() => {
  // ── DOM helpers ──────────────────────────────────────────
  const $ = (id) => document.getElementById(id);

  // ── Format file size ─────────────────────────────────────
  function fmtSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  }

  // ── Escape HTML ──────────────────────────────────────────
  function esc(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Markdown to HTML (limited, safe) ─────────────────────
  function md2html(md) {
    if (!md) return '';
    let s = md
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^---$/gm, '<hr/>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^[-•*] (.+)$/gm, '<li>$1</li>');
    s = s.replace(/(<li>[^]*?<\/li>\n?)+/g, m => '<ul>' + m + '</ul>');
    s = s.split(/\n{2,}/).map(b => {
      b = b.trim();
      if (!b) return '';
      if (/^<(h[23]|ul|hr|blockquote)/.test(b)) return b;
      return '<p>' + b.replace(/\n/g, '<br/>') + '</p>';
    }).join('');
    return s;
  }

  // ── Toast notification ───────────────────────────────────
  function toast(msg, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity .3s';
      setTimeout(() => el.remove(), 300);
    }, 4000);
  }

  // ── Show error box ───────────────────────────────────────
  function showErr(msg) {
    const box = $('err-box');
    const text = $('err-text');
    if (!box || !text) return;
    text.textContent = msg;
    box.classList.add('show');
  }

  function hideErr() {
    const box = $('err-box');
    if (box) box.classList.remove('show');
  }

  // ── Create a document ID (UUID v4) ───────────────────────
  function newId() {
    return crypto.randomUUID();
  }

  // ── Format date ──────────────────────────────────────────
  function fmtDate(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  return { $, fmtSize, esc, md2html, toast, showErr, hideErr, newId, fmtDate };
})();

window.APP = APP;
