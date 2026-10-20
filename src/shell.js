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
    report: 'M8 4h8l3 3v13H5V4h3zM9 12h6M9 16h4',
    out: 'M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10',
    check: 'M5 12.5l4.5 4.5L19 7.5'
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
          h('span', { class: 'edr-label' }, 'Search'),
          h('kbd', { class: 'edr-label' }, isMac ? '⌘K' : 'Ctrl K')),
        nav,
        h('div', { class: 'edr-shell-foot' },
          footBtn(I.classic, 'Classic view', classicView),
          footBtn(I.report, 'Copy layout report', copyReport),
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
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === '[') { e.preventDefault(); toggleNav(); }
      else if (e.key === ']' && document.getElementById('PT_SIDE')) { e.preventDefault(); toggleSide(); }
    });
  }

  function isTyping(el) {
    return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
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

  async function copyReport(e) {
    const btn = e.currentTarget;
    const label = btn.querySelector('.edr-label');
    const text = EDR.diag.layoutReport();
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const ta = h('textarea', { style: { position: 'fixed', opacity: '0' } }, text);
      document.documentElement.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    btn.classList.add('is-done');
    btn.firstChild.replaceWith(EDR.icon(I.check, 16));
    label.textContent = 'Copied, structure only';
    setTimeout(() => {
      btn.classList.remove('is-done');
      btn.firstChild.replaceWith(EDR.icon(I.report, 16));
      label.textContent = 'Copy layout report';
    }, 2400);
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

  let palette = null;

  function openPalette() {
    if (palette) { palette.input.focus(); return; }
    const index = EDR.routes.searchIndex();
    const returnFocus = document.activeElement;
    let results = [];
    let active = 0;

    const list = h('ul', { class: 'edr-pal-list', role: 'listbox', id: 'edr-pal-list', 'aria-label': 'Results' });
    const input = h('input', {
      class: 'edr-pal-input', type: 'search', placeholder: 'Search pages, forms and documents',
      role: 'combobox', 'aria-expanded': 'true', 'aria-autocomplete': 'list',
      'aria-label': 'Search EduRec', 'aria-controls': 'edr-pal-list', autocomplete: 'off', spellcheck: 'false'
    });
    const kbd = (k) => h('kbd', null, k);
    const overlay = h('div', { class: 'edr-root edr-pal-overlay', onmousedown: (e) => { if (e.target === overlay) close(); } },
      h('div', { class: 'edr-pal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search EduRec' },
        h('div', { class: 'edr-pal-head' }, EDR.icon(I.search, 18), input, kbd('Esc')),
        list,
        h('div', { class: 'edr-pal-foot' },
          h('span', null, kbd('↑'), kbd('↓'), ' move'),
          h('span', null, kbd('Enter'), ' open'),
          h('span', null, kbd('['), ' sidebar'),
          h('span', null, kbd(']'), ' page list'))));

    function render() {
      results = EDR.routes.search(input.value, index).slice(0, 12);
      active = Math.min(active, Math.max(results.length - 1, 0));
      list.replaceChildren(...(results.length ? results.map((r, i) =>
        h('li', { role: 'option', id: 'edr-opt-' + i, 'aria-selected': i === active ? 'true' : 'false' },
          h('a', { class: 'edr-pal-item' + (i === active ? ' is-active' : ''), href: r.href, tabindex: '-1', onmousemove: () => { if (active !== i) { active = i; render(); } } },
            h('span', { class: 'edr-pal-label' }, r.label),
            h('span', { class: 'edr-pal-hint' }, r.hint)))
      ) : [h('li', { class: 'edr-pal-empty' }, 'Nothing matches “' + input.value.trim() + '”. Try a course code, “transcript” or “leave”.')]));
      if (results.length) {
        input.setAttribute('aria-activedescendant', 'edr-opt-' + active);
        const el = document.getElementById('edr-opt-' + active);
        if (el) el.scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }

    function close() {
      overlay.remove();
      palette = null;
      if (returnFocus && returnFocus.focus) returnFocus.focus();
    }

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, results.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
      else if (e.key === 'Enter' && results[active]) location.href = results[active].href;
      else if (e.key === 'Tab') e.preventDefault();
    });

    document.documentElement.append(overlay);
    palette = { input };
    render();
    input.focus();
  }

  EDR.shell = { mount, mountRestoreButton, openPalette, ensureSideToggle, toggleNav, toggleSide };
})();
