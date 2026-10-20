(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // Sidebar + search palette, mounted once in the top frame of every EduRec page.
  function mount(page) {
    if (document.getElementById('edr-shell')) return;
    const { SECTIONS, sectionHref, logoutHref } = EDR.routes;

    const nav = h('nav', { class: 'edr-nav', 'aria-label': 'EduRec' },
      SECTIONS.map((s) => h('a', {
        class: 'edr-nav-item' + (page.section === s.id ? ' is-active' : ''),
        href: sectionHref(s),
        'aria-current': page.section === s.id ? 'page' : null
      }, EDR.icon(s.icon), h('span', null, s.label)))
    );

    const shell = h('aside', { id: 'edr-shell', class: 'edr-root edr-shell' },
      h('a', { class: 'edr-brand', href: EDR.routes.HOME },
        h('span', { class: 'edr-brand-name' }, 'EduRec'),
        h('span', { class: 'edr-brand-sub' }, 'Education Records System')),
      h('div', { class: 'edr-shell-body' },
        h('button', { class: 'edr-search-btn', type: 'button', onclick: () => openPalette() },
          EDR.icon('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5', 16),
          h('span', null, 'Search'),
          h('kbd', null, navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl K')),
        nav,
        h('div', { class: 'edr-shell-foot' },
          h('button', { class: 'edr-link-btn', type: 'button', onclick: classicView }, 'Classic view'),
          h('a', { class: 'edr-link-btn', href: logoutHref }, 'Sign out'),
          h('p', { class: 'edr-fineprint' }, 'Unofficial personal reskin. Read-only.')))
    );

    const toggle = h('button', {
      class: 'edr-root edr-menu-toggle', type: 'button', 'aria-label': 'Menu', 'aria-controls': 'edr-shell',
      onclick: () => document.documentElement.classList.toggle('edr-nav-open')
    }, EDR.icon('M4 7h16M4 12h16M4 17h16', 20));

    document.body.prepend(shell, toggle);
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openPalette();
      }
    });
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
    document.body.append(btn);
  }

  let palette = null;

  function openPalette() {
    if (palette) { palette.input.focus(); return; }
    const index = EDR.routes.searchIndex();
    let results = [];
    let active = 0;

    const list = h('ul', { class: 'edr-pal-list', role: 'listbox', id: 'edr-pal-list' });
    const input = h('input', {
      class: 'edr-pal-input', type: 'search', placeholder: 'Search pages, forms and documents',
      'aria-label': 'Search EduRec', 'aria-controls': 'edr-pal-list', autocomplete: 'off'
    });
    const overlay = h('div', { class: 'edr-root edr-pal-overlay', onclick: (e) => { if (e.target === overlay) close(); } },
      h('div', { class: 'edr-pal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search EduRec' },
        h('div', { class: 'edr-pal-head' }, EDR.icon('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-3.5-3.5', 18), input),
        list,
        h('div', { class: 'edr-pal-foot' }, '↑ ↓ to move · Enter to open · Esc to close')));

    function render() {
      results = EDR.routes.search(input.value, index).slice(0, 12);
      active = Math.min(active, Math.max(results.length - 1, 0));
      list.replaceChildren(...(results.length ? results.map((r, i) =>
        h('li', { role: 'option', 'aria-selected': i === active ? 'true' : 'false' },
          h('a', { class: 'edr-pal-item' + (i === active ? ' is-active' : ''), href: r.href },
            h('span', { class: 'edr-pal-label' }, r.label),
            h('span', { class: 'edr-pal-hint' }, r.hint)))
      ) : [h('li', { class: 'edr-pal-empty' }, 'No matching pages.')]));
    }

    function close() {
      overlay.remove();
      palette = null;
    }

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, results.length - 1); render(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); render(); }
      else if (e.key === 'Enter' && results[active]) location.href = results[active].href;
    });

    document.body.append(overlay);
    palette = { input };
    render();
    input.focus();
  }

  EDR.shell = { mount, mountRestoreButton, openPalette };
})();
