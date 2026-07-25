// theme-pullcord.js — React island that mounts PullCord for light/dark theme toggling
// Uses React + motion served via import map from esm.sh CDN.
// Only loaded on pages with a #theme-pullcord-mount element.

import { createElement, useCallback, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { PullCord } from 'pullcord';

const PULLCORD_CONFIG = {
  gravity: 1250,
  damping: 0.94,
  iterations: 20,
  stretchMax: 26,
};

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

function toggleTheme() {
  const cur = getTheme();
  const next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

/**
 * Mount a PullCord component into the given container element.
 * The cord controls the `data-theme` attribute on <html>.
 */
export function mountThemePullcord(container) {
  // Clear the container so React can manage it
  container.innerHTML = '';

  const root = createRoot(container);

  // Simple wrapper that re-renders on pull
  function PullcordToggle() {
    const [dark, setDark] = useState(() => getTheme() === 'dark');

    const handlePull = useCallback(() => {
      toggleTheme();
      setDark(prev => !prev);
    }, []);

    // Sync if theme changes externally (e.g. system preference)
    useEffect(() => {
      const observer = new MutationObserver(() => {
        setDark(getTheme() === 'dark');
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
      return () => observer.disconnect();
    }, []);

    return createElement(PullCord, {
      onPull: handlePull,
      pulled: dark,
      ariaLabel: 'Toggle theme',
      config: PULLCORD_CONFIG,
      noEntrance: true, // skip initial drop animation on every page nav
    });
  }

  root.render(createElement(PullcordToggle));
}
