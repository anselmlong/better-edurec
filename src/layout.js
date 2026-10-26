(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // Layout fixes that depend on what a block holds, which CSS can't see. Only
  // classes and our own toggles are added: EduRec's elements stay where
  // PeopleSoft put them. Re-run on every page change (from enhancers.run).

  const FIELD = '.ps_box-edit, .ps_box-dropdown, .ps_box-date, .ps_box-checkbox, .ps_box-radio';
  const BUTTON = '.ps_box-button, .ps-button, input[type="button"], input[type="submit"]';
  const shown = (el) => el.getClientRects().length > 0;

  // A few short fields and a button (term pickers, All Terms … GO) read as one row.
  function filterBars(root) {
    for (const g of root.querySelectorAll('.ps_box-group:not(.edr-filterbar)')) {
      const kids = [...g.children].filter(shown);
      const fields = kids.filter((k) => k.matches(FIELD)).length;
      const buttons = kids.filter((k) => k.matches(BUTTON)).length;
      if (fields && fields <= 4 && buttons && buttons <= 2 && fields + buttons === kids.length && !g.querySelector('textarea')) {
        g.classList.add('edr-filterbar');
      }
    }
  }

  // Instruction walls fold to their first lines so the task comes first. Blocks
  // with controls in them are never folded.
  const NOTE = '#PT_MAIN :is(.psc_label-none, .ps_box-longedit) > .ps_box-value, #PT_MAIN .ps_box-htmlarea';
  const LONG = 600; // characters: about six lines at the 72ch measure
  function foldNotes(root) {
    for (const v of root.querySelectorAll(NOTE)) {
      if (v.classList.contains('edr-fold') || v.textContent.trim().length < LONG) continue;
      if (v.querySelector('a, button, input, select, textarea')) continue;
      v.classList.add('edr-fold');
      const label = h('span', null, 'Show all');
      const btn = h('button', { type: 'button', class: 'edr-root edr-fold-toggle', 'aria-expanded': 'false' },
        label, EDR.icon('M6 9l6 6 6-6', 16));
      btn.addEventListener('click', () => {
        const open = v.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', String(open));
        label.textContent = open ? 'Show less' : 'Show all';
      });
      v.after(btn);
    }
  }

  function run() {
    const main = document.getElementById('PT_MAIN') || document.body;
    filterBars(main);
    foldNotes(document);
  }

  EDR.layout = { run };
})();
