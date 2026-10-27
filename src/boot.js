(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // Runs at document_start, before EduRec paints. chrome.storage is async, so the
  // last-known flags and theme colours are cached in this site's localStorage and
  // applied synchronously here; main.js confirms them once storage loads. Without
  // this, every page would first paint as stock EduRec and then snap to the reskin.
  const KEY = 'edr:boot';
  const root = document.documentElement;
  const isTop = (() => { try { return window.top === window; } catch (e) { return false; } })();
  const ATTRS = ['on', 'top', 'home', 'collapsed', 'side-collapsed', 'dark', 'theme', 'pending'];

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }

  // Called by main.js with the real settings, so the next page boots correctly.
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
  }

  // Undo everything boot applied (sign-in page, reskin off, failed start).
  function clear() {
    for (const a of ATTRS) root.removeAttribute('data-edr-' + a);
    const style = document.getElementById('edr-boot-style');
    if (style) style.remove();
  }

  const isLanding = () => {
    if (!/\.PT_LANDINGPAGE\.GBL/.test(location.pathname)) return false;
    const lp = new URLSearchParams(location.search).get('lp');
    return !lp || lp === 'SA.EMPLOYEE.DEFAULT_LP';
  };

  EDR.boot = { save, clear, KEY };

  const state = read();
  if (!state || !state.on || /[?&]cmd=(login|logout|expire)\b/.test(location.search)) return;

  root.setAttribute('data-edr-on', '');
  // EduRec's content waits for the enhancers' first pass (enhancers.start), so a
  // grid they replace never flashes; shown anyway if that pass never comes.
  root.setAttribute('data-edr-pending', '');
  setTimeout(() => root.removeAttribute('data-edr-pending'), 2000);
  if (state.theme) root.setAttribute('data-edr-theme', state.theme);
  if (state.dark) root.setAttribute('data-edr-dark', '');
  if (isTop) {
    root.setAttribute('data-edr-top', '');
    if (state.collapsed) root.setAttribute('data-edr-collapsed', '');
    if (state.sideCollapsed) root.setAttribute('data-edr-side-collapsed', '');
    if (state.overviewHome !== false && isLanding()) root.setAttribute('data-edr-home', '');
  }
  if (state.css) {
    const style = document.createElement('style');
    style.id = 'edr-boot-style';
    style.textContent = state.css;
    root.append(style);
  }

  // The sign-in page shares the homepage URL; never hide or restyle it.
  document.addEventListener('DOMContentLoaded', () => {
    if (document.querySelector('form#login')) clear();
  }, { once: true });
})();
