(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  const I = {
    search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5',
    collapse: 'M4 5h16v14H4zM9 5v14M15.5 10l-2 2 2 2',
    expand: 'M4 5h16v14H4zM9 5v14M13.5 10l2 2-2 2',
    pages: 'M4 5h16v14H4zM9 5v14M5.5 9h2M5.5 12h2M5.5 15h2',
    menu: 'M4 7h16M4 12h16M4 17h16',
    classic: 'M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4',
    out: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
    theme: 'M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 21 9.7C21 5.9 17 3 12 3zM7.5 12.5h.01M9 8h.01M14 7h.01M17 10.5h.01',
    keys: 'M3 7h18v11H3zM7 11h.01M11 11h.01M15 11h.01M8 15h8'
  };
  const isMac = navigator.platform.includes('Mac');

  // Sidebar + search palette, mounted once in the top frame of every EduRec page.
  function mount(page) {
    if (document.getElementById('edr-shell')) return;
    const { SECTIONS, sectionHref, logoutHref } = EDR.routes;

    const nav = h('nav', { class: 'edr-nav', 'aria-label': 'EduRec' },
      SECTIONS.map((s) => h('a', {
        class: 'edr-nav-item' + (page.section === s.id ? ' is-active' : ''),
        href: sectionHref(s),
        'data-tip': s.label,
        'aria-current': page.section === s.id ? 'page' : null
      }, EDR.icon(s.icon), h('span', { class: 'edr-label' }, s.label)))
    );

    const collapseBtn = h('button', {
      class: 'edr-icon-btn edr-collapse-btn', type: 'button', onclick: toggleNav,
      'aria-label': 'Collapse sidebar', 'aria-controls': 'edr-shell', 'aria-expanded': 'true',
      title: 'Collapse sidebar  [',
    }, EDR.icon(I.collapse, 18));

    const footBtn = (icon, label, onclick, href) => (href
      ? h('a', { class: 'edr-link-btn', href, 'data-tip': label }, EDR.icon(icon, 16), h('span', { class: 'edr-label' }, label))
      : h('button', { class: 'edr-link-btn', type: 'button', onclick, 'data-tip': label }, EDR.icon(icon, 16), h('span', { class: 'edr-label' }, label)));

    const shell = h('aside', { id: 'edr-shell', class: 'edr-root edr-shell' },
      h('div', { class: 'edr-brand' },
        h('a', { class: 'edr-brand-link', href: EDR.routes.HOME, 'aria-label': 'EduRec overview' },
          h('span', { class: 'edr-brand-mark', 'aria-hidden': 'true' }, 'E'),
          h('span', { class: 'edr-brand-text' },
            h('span', { class: 'edr-brand-name' }, 'EduRec'),
            h('span', { class: 'edr-brand-sub' }, 'Education Records System'))),
        collapseBtn),
      h('div', { class: 'edr-shell-body' },
        h('button', { class: 'edr-search-btn', type: 'button', onclick: () => openPalette(), 'data-tip': 'Search', 'aria-label': 'Search EduRec' },
          EDR.icon(I.search, 16),
          h('span', { class: 'edr-label edr-search-label' }, 'Search'),
          h('kbd', { class: 'edr-label' }, isMac ? '⌘K' : 'Ctrl K')),
        nav,
        h('div', { class: 'edr-shell-foot' },
          footBtn(I.theme, 'Theme', () => openPalette({ mode: 'theme' })),
          footBtn(I.keys, 'Keyboard shortcuts', openHelp),
          footBtn(I.classic, 'Classic view', classicView),
          footBtn(I.out, 'Sign out', null, logoutHref),
          h('p', { class: 'edr-fineprint edr-label' }, 'Unofficial personal reskin. Read-only.')))
    );

    const toggle = h('button', {
      class: 'edr-root edr-menu-toggle', type: 'button', 'aria-label': 'Menu', 'aria-controls': 'edr-shell',
      onclick: () => EDR.flag('nav-open', !document.documentElement.hasAttribute('data-edr-nav-open'))
    }, EDR.icon(I.menu, 20));

    // Mounted on <html>, outside <body>, so the body offset in theme.css doesn't move it.
    document.documentElement.append(shell, toggle);
    syncNavButton();

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
        return;
      }
    });
  }

  const has = (name) => document.documentElement.hasAttribute('data-edr-' + name);

  function toggleNav() {
    const collapsed = !has('collapsed');
    EDR.flag('collapsed', collapsed);
    slidePage(collapsed ? 184 : -184);
    syncNavButton();
    EDR.store.setPrefs({ navCollapsed: collapsed });
  }

  // FLIP: the page snaps to its new offset once, then glides there with a transform,
  // so EduRec's heavy layout is computed one time instead of every frame.
  function slidePage(fromX) {
    if (innerWidth < 900 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.getElementById('edr-overview') || document.getElementById('PT_WRAPPER');
    if (!el || !el.animate) return;
    el.animate([{ transform: 'translateX(' + fromX + 'px)' }, { transform: 'none' }],
      { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' });
  }

  function syncNavButton() {
    const btn = document.querySelector('.edr-collapse-btn');
    if (!btn) return;
    const collapsed = has('collapsed');
    btn.replaceChildren(EDR.icon(collapsed ? I.expand : I.collapse, 18));
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    btn.title = (collapsed ? 'Expand sidebar' : 'Collapse sidebar') + '  [';
  }

  // EduRec's own page list (#PT_SIDE). The toggle lives in EduRec's header, which
  // PeopleSoft re-renders on navigation, so this is re-checked on every page change.
  function ensureSideToggle() {
    if (!EDR.isTop) return;
    const side = document.getElementById('PT_SIDE');
    const slot = document.querySelector('[id$="hdrdivPT_NAV_CONT"]');
    let btn = document.getElementById('edr-side-toggle');
    if (!side || !slot) { if (btn) btn.remove(); return; }
    if (!btn) {
      btn = h('button', { id: 'edr-side-toggle', class: 'edr-root edr-side-toggle', type: 'button', onclick: toggleSide, 'aria-controls': 'PT_SIDE' },
        EDR.icon(I.pages, 16), h('span', null, 'Pages'));
    }
    if (btn.parentElement !== slot) slot.append(btn);
    const hidden = has('side-collapsed');
    btn.setAttribute('aria-pressed', hidden ? 'false' : 'true');
    btn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    btn.title = (hidden ? 'Show page list' : 'Hide page list') + '  ]';
  }

  function toggleSide() {
    const hidden = !has('side-collapsed');
    EDR.flag('side-collapsed', hidden);
    // Let the content settle into its new width instead of jumping.
    const content = document.getElementById('PT_CONTENT');
    if (content) {
      content.classList.remove('edr-settle');
      void content.offsetWidth;
      content.classList.add('edr-settle');
    }
    ensureSideToggle();
    EDR.store.setPrefs({ sideCollapsed: hidden });
  }

  async function classicView() {
    await EDR.store.setEnabled(false);
    location.reload();
  }

  // Shown when the reskin is off, so it can be turned back on in one click.
  function mountRestoreButton() {
    if (document.getElementById('edr-restore')) return;
    const btn = h('button', {
      id: 'edr-restore', class: 'edr-root edr-restore', type: 'button',
      onclick: async () => { await EDR.store.setEnabled(true); location.reload(); }
    }, 'Use new EduRec view');
    document.documentElement.append(btn);
  }

  // ---- Palette: search, ':' commands, and the theme picker share one component ----

  function setTheme(id) {
    EDR.themes.apply(id);
    EDR.store.setPrefs({ theme: id });
  }

  function commands() {
    const t = EDR.themes;
    return [
      { label: 'Set up Overview', hint: 'Command', keys: 'setup overview wizard collect', run: () => EDR.wizard.start() },
      { label: 'Open Overview', hint: 'Command', keys: 'overview home dashboard', href: EDR.routes.HOME + '#overview' },
      { label: 'Pick a theme', hint: 'Command', keys: 'theme themes colour color picker', run: () => openPalette({ mode: 'theme' }) },
      ...t.THEMES.map((th) => ({ label: 'Theme: ' + th.label, hint: 'Command', keys: 'theme ' + th.id + ' ' + th.label.toLowerCase(), run: () => setTheme(th.id) })),
      { label: 'Toggle sidebar', hint: 'Command', keys: 'sidebar collapse expand nav rail', run: toggleNav },
      { label: 'Toggle page list', hint: 'Command', keys: 'pages page list side panel', run: () => { if (document.getElementById('PT_SIDE')) toggleSide(); } },
      { label: 'Keyboard shortcuts', hint: 'Command', keys: 'help keys keyboard shortcuts vim', run: openHelp },
      { label: 'Classic view', hint: 'Command', keys: 'classic off disable original', run: classicView }
    ];
  }

  const words = (q) => q.toLowerCase().replace(/^:/, '').trim().split(/\s+/).filter(Boolean);
  const matches = (item, ws) => ws.every((w) => (item.keys + ' ' + item.label.toLowerCase()).includes(w));

  const MODES = {
    search: {
      placeholder: 'Search pages, forms and commands',
      items: (q, index) => {
        const pages = EDR.routes.search(q, index);
        const cmds = q.trim() ? commands().filter((c) => matches(c, words(q))) : [];
        return pages.slice(0, 9).concat(cmds.slice(0, 4));
      }
    },
    command: {
      placeholder: 'Command, e.g. theme nord, setup, sidebar',
      prefix: ':',
      items: (q) => commands().filter((c) => matches(c, words(q)))
    },
    theme: {
      placeholder: 'Theme',
      items: (q) => EDR.themes.THEMES
        .filter((th) => !q.trim() || th.label.toLowerCase().includes(q.trim().toLowerCase()))
        .map((th) => ({ label: th.label, hint: th.dark ? 'Dark' : 'Light', theme: th.id, swatch: [th.tokens.bg, th.tokens.surface, th.tokens.navy, th.tokens.ink] }))
    }
  };

  let palette = null;

  function openPalette(opts) {
    const mode = (opts && opts.mode) || 'search';
    if (palette) { palette.close(true); }
    const spec = MODES[mode];
    const index = EDR.routes.searchIndex();
    const returnFocus = document.activeElement;
    const originalTheme = document.documentElement.getAttribute('data-edr-theme');
    let results = [];
    let active = 0;
    let picked = false;

    const list = h('ul', { class: 'edr-pal-list', role: 'listbox', id: 'edr-pal-list', 'aria-label': 'Results' });
    const input = h('input', {
      class: 'edr-pal-input', type: 'text', placeholder: spec.placeholder,
      role: 'combobox', 'aria-expanded': 'true', 'aria-autocomplete': 'list',
      'aria-label': spec.placeholder, 'aria-controls': 'edr-pal-list', autocomplete: 'off', spellcheck: 'false'
    });
    const kbd = (k) => h('kbd', null, k);
    const overlay = h('div', { class: 'edr-root edr-pal-overlay', onmousedown: (e) => { if (e.target === overlay) close(); } },
      h('div', { class: 'edr-pal', role: 'dialog', 'aria-modal': 'true', 'aria-label': spec.placeholder },
        h('div', { class: 'edr-pal-head' },
          spec.prefix ? h('span', { class: 'edr-pal-prefix', 'aria-hidden': 'true' }, spec.prefix) : EDR.icon(mode === 'theme' ? I.theme : I.search, 18),
          input, kbd('Esc')),
        list,
        h('div', { class: 'edr-pal-foot' },
          h('span', null, kbd('↑'), kbd('↓'), ' move'),
          h('span', null, kbd('Enter'), mode === 'theme' ? ' keep' : ' open'),
          mode === 'theme' ? h('span', null, kbd('Esc'), ' revert') : h('span', null, kbd('?'), ' all shortcuts'))));

    function preview() {
      const r = results[active];
      if (mode === 'theme' && r) EDR.themes.apply(r.theme);
    }

    function render() {
      results = spec.items(input.value, index).slice(0, 14);
      active = Math.min(active, Math.max(results.length - 1, 0));
      list.replaceChildren(...(results.length ? results.map((r, i) =>
        h('li', { role: 'option', id: 'edr-opt-' + i, 'aria-selected': i === active ? 'true' : 'false' },
          h(r.href ? 'a' : 'button', {
            class: 'edr-pal-item' + (i === active ? ' is-active' : ''), href: r.href || null, type: r.href ? null : 'button', tabindex: '-1',
            onmousemove: () => { if (active !== i) { active = i; render(); preview(); } },
            onclick: (e) => { if (!r.href) { e.preventDefault(); pick(r); } }
          },
            r.swatch ? h('span', { class: 'edr-swatch', 'aria-hidden': 'true' }, r.swatch.map((c) => h('span', { style: { background: c } }))) : null,
            h('span', { class: 'edr-pal-label' }, r.label),
            h('span', { class: 'edr-pal-hint' }, r.theme === originalTheme ? 'Current' : r.hint)))
      ) : [h('li', { class: 'edr-pal-empty' }, 'Nothing matches “' + input.value.trim() + '”.')]));
      if (results.length) {
        input.setAttribute('aria-activedescendant', 'edr-opt-' + active);
        const el = document.getElementById('edr-opt-' + active);
        if (el) el.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }

    function pick(r) {
      if (!r) return;
      picked = true;
      if (r.theme) { setTheme(r.theme); close(); return; }
      close();
      if (r.run) r.run();
      else if (r.href) location.href = r.href;
    }

    function close(silent) {
      if (mode === 'theme' && !picked) EDR.themes.apply(originalTheme);
      overlay.remove();
      palette = null;
      if (!silent && returnFocus && returnFocus.focus) returnFocus.focus();
    }

    input.addEventListener('input', () => { active = 0; render(); preview(); });
    input.addEventListener('keydown', (e) => {
      const down = e.key === 'ArrowDown' || (e.ctrlKey && (e.key === 'n' || e.key === 'j'));
      const up = e.key === 'ArrowUp' || (e.ctrlKey && (e.key === 'p' || e.key === 'k'));
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (down) { e.preventDefault(); active = Math.min(active + 1, results.length - 1); render(); preview(); }
      else if (up) { e.preventDefault(); active = Math.max(active - 1, 0); render(); preview(); }
      else if (e.key === 'Enter') { e.preventDefault(); pick(results[active]); }
      else if (e.key === 'Tab') e.preventDefault();
    });

    document.documentElement.append(overlay);
    palette = { input, close };
    if (mode === 'theme') active = Math.max(0, EDR.themes.THEMES.findIndex((th) => th.id === originalTheme));
    render();
    input.focus();
  }

  // ---- ? cheat sheet, generated from the key table ----

  function openHelp() {
    if (document.querySelector('.edr-help-overlay')) return;
    const returnFocus = document.activeElement;
    const groups = {};
    for (const b of EDR.keys.BINDINGS) {
      if (b.hidden) continue;
      (groups[b.group] = groups[b.group] || []).push(b);
    }
    const close = () => { overlay.remove(); if (returnFocus && returnFocus.focus) returnFocus.focus(); };
    const closeBtn = h('button', { type: 'button', class: 'edr-icon-btn is-dark', 'aria-label': 'Close', onclick: close }, EDR.icon('M6 6l12 12M18 6L6 18', 16));
    const overlay = h('div', {
      class: 'edr-root edr-help-overlay', onmousedown: (e) => { if (e.target === overlay) close(); },
      onkeydown: (e) => { if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); close(); } }
    },
      h('div', { class: 'edr-help', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'edr-help-title' },
        h('div', { class: 'edr-help-head' }, h('h2', { class: 'edr-h2', id: 'edr-help-title' }, 'Keyboard shortcuts'), closeBtn),
        h('div', { class: 'edr-help-grid' },
          Object.keys(groups).map((g) => h('section', null,
            h('h3', { class: 'edr-h3' }, g),
            h('dl', { class: 'edr-help-list' }, groups[g].flatMap((b) => [
              h('dt', null, (b.help ? [b.help] : b.seq).map((k) => h('kbd', null, k))),
              h('dd', null, b.label)
            ])))),
          h('section', null,
            h('h3', { class: 'edr-h3' }, 'Anywhere'),
            h('dl', { class: 'edr-help-list' },
              h('dt', null, h('kbd', null, isMac ? '⌘' : 'Ctrl'), h('kbd', null, 'K')), h('dd', null, 'Search'),
              h('dt', null, h('kbd', null, 'Esc')), h('dd', null, 'Close a panel'))))));
    document.documentElement.append(overlay);
    closeBtn.focus();
  }

  // Shortcut links carry #edr-open=<page-list label>; click that item once it renders.
  // Only labels from the shortcut table are followed, and only page-list links.
  function followDeepLink() {
    const m = /#edr-open=([^&]+)/.exec(location.hash);
    if (!m) return;
    const label = decodeURIComponent(m[1]);
    if (!EDR.routes.SHORTCUTS.some((sc) => sc.open === label)) return;
    history.replaceState(null, '', location.pathname + location.search);
    const started = Date.now();
    const timer = setInterval(() => {
      const link = [...document.querySelectorAll('ul.psa_list-linkmenu a')].find((a) => a.textContent.trim() === label);
      if (link) {
        clearInterval(timer);
        const li = link.closest('li');
        if (!li || !li.classList.contains('psc_selected')) link.click();
      } else if (Date.now() - started > 10000) clearInterval(timer);
    }, 300);
  }

  // h moves focus into the sidebar; on narrow screens that means opening the drawer.
  function revealNav() {
    if (innerWidth < 900) EDR.flag('nav-open', true);
  }

  EDR.shell = { mount, mountRestoreButton, openPalette, openHelp, revealNav, followDeepLink, ensureSideToggle, toggleNav, toggleSide, setTheme };
})();
