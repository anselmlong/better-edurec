(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // Vim-style bindings. One table drives both dispatch and the ? cheat sheet.
  const BINDINGS = [
    { seq: ['j'], action: 'next', group: 'Move', label: 'Next item' },
    { seq: ['k'], action: 'prev', group: 'Move', label: 'Previous item' },
    { seq: ['h'], action: 'paneLeft', group: 'Move', label: 'Pane to the left (sidebar, page list)' },
    { seq: ['l'], action: 'paneRight', group: 'Move', label: 'Pane to the right (content)' },
    { seq: ['g', 'g'], action: 'first', group: 'Move', label: 'First item' },
    { seq: ['G'], action: 'last', group: 'Move', label: 'Last item' },
    { seq: ['o'], action: 'open', group: 'Move', label: 'Open the focused item (or Enter)' },
    { seq: ['d'], action: 'halfDown', group: 'Scroll', label: 'Half a page down' },
    { seq: ['u'], action: 'halfUp', group: 'Scroll', label: 'Half a page up' },
    { seq: ['g', 'i'], action: 'firstInput', group: 'Scroll', label: 'Focus the first text field' },
    { seq: ['/'], action: 'search', group: 'Go', label: 'Search pages and forms' },
    { seq: [':'], action: 'command', group: 'Go', label: 'Command line (:theme nord, :setup…)' },
    { seq: ['H'], action: 'back', group: 'Go', label: 'Back' },
    { seq: ['L'], action: 'forward', group: 'Go', label: 'Forward' },
    { seq: ['1'], action: 'section', arg: 0, group: 'Go', label: 'Sidebar section 1–9', help: '1 – 9' },
    ...[2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({ seq: [String(n)], action: 'section', arg: n - 1, group: 'Go', hidden: true })),
    { seq: ['['], action: 'toggleNav', group: 'View', label: 'Collapse or expand the sidebar' },
    { seq: [']'], action: 'toggleSide', group: 'View', label: 'Hide or show EduRec’s page list' },
    { seq: ['t'], action: 'themes', group: 'View', label: 'Pick a theme' },
    { seq: ['?'], action: 'help', group: 'View', label: 'Show this cheat sheet' }
  ];

  // Pure: given the keys typed so far, return the binding, a partial match, or nothing.
  function resolve(buffer, bindings) {
    const list = bindings || BINDINGS;
    const exact = list.find((b) => b.seq.length === buffer.length && b.seq.every((k, i) => k === buffer[i]));
    if (exact) return { binding: exact };
    const partial = list.some((b) => b.seq.length > buffer.length && buffer.every((k, i) => b.seq[i] === k));
    return partial ? { partial: true } : { none: true };
  }

  // ---- DOM side ----

  const PANES = {
    nav: () => qsa('#edr-shell .edr-nav-item'),
    side: () => qsa('#PT_SIDE ul.psa_list-linkmenu a'),
    content: () => document.getElementById('edr-overview')
      ? qsa('#edr-overview .edr-btn, #edr-overview .edr-card-link')
      : qsa('#PT_MAIN .ps_box-grid-list li a, #PT_MAIN tr.ps_grid-row a, #PT_MAIN a.ps-link, #PT_MAIN .ps-button')
  };
  const ORDER = ['nav', 'side', 'content'];

  function qsa(sel) {
    return [...document.querySelectorAll(sel)].filter((el) => (el.checkVisibility ? el.checkVisibility() : el.getClientRects().length > 0));
  }

  function currentPane() {
    const a = document.activeElement;
    for (const name of ORDER) if (a && PANES[name]().includes(a)) return name;
    return 'content';
  }

  function focusIn(name, pick) {
    const items = PANES[name]();
    if (!items.length) return false;
    const i = Math.max(0, Math.min(items.length - 1, pick(items)));
    items[i].focus();
    items[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return true;
  }

  function move(step) {
    const pane = currentPane();
    focusIn(pane, (items) => {
      const i = items.indexOf(document.activeElement);
      return i < 0 ? (step > 0 ? 0 : items.length - 1) : (i + step + items.length) % items.length;
    });
  }

  function switchPane(dir) {
    const panes = ORDER.filter((p) => PANES[p]().length);
    const at = panes.indexOf(currentPane());
    const target = panes[Math.max(0, Math.min(panes.length - 1, (at < 0 ? panes.length - 1 : at) + dir))];
    if (target === 'nav') EDR.shell.revealNav();
    focusIn(target, (items) => {
      const sel = items.findIndex((el) => el.matches('.is-active, li.psc_selected a'));
      return sel >= 0 ? sel : 0;
    });
  }

  function scroller() {
    const main = document.querySelector('#PT_CONTENT .ps_scrollable_v, #PT_MAIN');
    return main && main.scrollHeight > main.clientHeight + 4 ? main : document.scrollingElement;
  }

  const ACTIONS = {
    next: () => move(1),
    prev: () => move(-1),
    first: () => focusIn(currentPane(), () => 0),
    last: () => focusIn(currentPane(), (items) => items.length - 1),
    paneLeft: () => switchPane(-1),
    paneRight: () => switchPane(1),
    open: () => { const a = document.activeElement; if (a && a !== document.body) a.click(); },
    halfDown: () => scroller().scrollBy({ top: innerHeight / 2, behavior: 'smooth' }),
    halfUp: () => scroller().scrollBy({ top: -innerHeight / 2, behavior: 'smooth' }),
    firstInput: () => { const f = qsa('#PT_MAIN input[type="text"], #PT_MAIN input:not([type]), #PT_MAIN textarea')[0]; if (f) f.focus(); },
    search: () => EDR.shell.openPalette(),
    command: () => EDR.shell.openPalette({ mode: 'command' }),
    back: () => history.back(),
    forward: () => history.forward(),
    section: (b) => { const s = EDR.routes.SECTIONS[b.arg]; if (s) location.href = EDR.routes.sectionHref(s); },
    toggleNav: () => EDR.shell.toggleNav(),
    toggleSide: () => { if (document.getElementById('PT_SIDE')) EDR.shell.toggleSide(); },
    themes: () => EDR.shell.openPalette({ mode: 'theme' }),
    help: () => EDR.shell.openHelp()
  };

  function isTyping(el) {
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  }

  let buffer = [];
  let timer = null;

  function onKey(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
    if (document.querySelector('.edr-pal-overlay, .edr-help-overlay')) return;
    if (e.key.length !== 1) return;
    buffer.push(e.key);
    clearTimeout(timer);
    const r = resolve(buffer);
    if (r.partial) {
      e.preventDefault();
      timer = setTimeout(() => { buffer = []; }, 900);
      return;
    }
    buffer = [];
    if (!r.binding) return;
    e.preventDefault();
    try { ACTIONS[r.binding.action](r.binding); } catch (err) { console.warn('[Better EduRec] key action failed', r.binding.action, err); }
  }

  function start() {
    document.addEventListener('keydown', onKey);
  }

  EDR.keys = { BINDINGS, resolve, start };
})();
