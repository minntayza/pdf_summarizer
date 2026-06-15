// font-size.js — User-adjustable font size
// Directly sets body font-size; all rem-based sizes cascade automatically

const FONT_SIZES = [
  { value: 16, label: 'S' },    // 16px base
  { value: 18, label: 'M' },    // 18px base (default)
  { value: 20, label: 'L' },    // 20px base
  { value: 22, label: 'XL' },   // 22px base
];

let currentIdx = 1; // M

function initFontSize() {
  const saved = parseFloat(localStorage.getItem('fontScale') || '18');
  let best = 1;
  let bestDist = Infinity;
  FONT_SIZES.forEach((fs, i) => {
    const d = Math.abs(fs.value - saved);
    if (d < bestDist) { bestDist = d; best = i; }
  });
  currentIdx = best;
  applyFontSize();
}

function cycleFontSize() {
  currentIdx = (currentIdx + 1) % FONT_SIZES.length;
  applyFontSize();
}

function applyFontSize() {
  const fs = FONT_SIZES[currentIdx];
  localStorage.setItem('fontScale', fs.value);
  document.documentElement.style.fontSize = fs.value + 'px';

  const btn = document.getElementById('font-size-btn');
  if (btn) {
    const info = FONT_SIZES[currentIdx];
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="4 7 12 3 20 7"/><polyline points="4 17 12 21 20 17"/><line x1="12" y1="3" x2="12" y2="21"/></svg><span style="font-size:10px;font-weight:700">${info.label}</span>`;
  }
}

export { initFontSize, cycleFontSize };
