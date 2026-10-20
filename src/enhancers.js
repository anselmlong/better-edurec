(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // Each enhancer recognises a page by its text, adds a readable summary card
  // above the original content and saves a snapshot for the Overview.
  // PeopleSoft swaps content in place, so this re-runs whenever the page changes.
  const ENHANCERS = [
    {
      key: 'audit', anchor: 'My Graduation Audit Report',
      test: (t) => t.includes('My Graduation Audit Report'),
      parse: (t) => EDR.parsers.parseAudit(t),
      useful: (d) => d && d.overall,
      render: auditCard
    },
    {
      key: 'results', anchor: 'Course Grades',
      test: (t) => t.includes('Course Grades') && /\bGPA\b/.test(t),
      parse: (t) => EDR.parsers.parseResults(t),
      useful: (d) => d && (d.courses.length || d.cumulativeGpa != null),
      render: resultsCard
    },
    {
      key: 'classes', anchor: 'Class Type',
      test: (t) => t.includes('Class Type'),
      parse: (t) => EDR.parsers.parseMyClasses(t),
      useful: (d) => d && d.courses.length,
      render: classesCard
    },
    {
      key: 'finaid', anchor: 'FA Code',
      test: (t) => t.includes('Posted Date') && t.includes('FA Code'),
      parse: (t) => EDR.parsers.parseFinAid(t),
      useful: (d) => d && d.rows.length,
      render: aidCard
    }
  ];

  const rendered = {};

  function run() {
    if (!document.body) return;
    const text = EDR.nodeText(document.body);
    for (const e of ENHANCERS) {
      const existing = document.getElementById('edr-card-' + e.key);
      const data = e.test(text) ? e.parse(text) : null;
      if (!e.useful(data)) {
        if (existing) existing.remove();
        rendered[e.key] = null;
        continue;
      }
      const sig = JSON.stringify(data);
      if (existing && rendered[e.key] === sig) continue;
      rendered[e.key] = sig;
      const el = e.render(data);
      el.id = 'edr-card-' + e.key;
      if (existing) existing.replaceWith(el);
      else place(el, e.anchor);
      EDR.store.saveSnapshot(e.key, data).catch(() => {});
    }
  }

  // Inserts the card just before the block that holds the anchor text.
  function place(el, anchorText) {
    const anchor = findText(anchorText);
    const block = anchor && (anchor.closest('.ps_box-group, .ps_box-grid, table') || anchor.parentElement);
    if (block && block.parentElement) block.parentElement.insertBefore(el, block);
    else (document.querySelector('form.PSForm') || document.body).append(el);
  }

  function findText(text) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (n.nodeValue.trim() === text && !n.parentElement.closest('.edr-root')) return n.parentElement;
    }
    return null;
  }

  function cardShell(title, ...body) {
    return h('section', { class: 'edr-root edr-inline' },
      h('div', { class: 'edr-inline-head' },
        h('h2', { class: 'edr-h2' }, title),
        h('span', { class: 'edr-badge' }, 'Summary')),
      ...body);
  }

  function auditCard(a) {
    const { required, taken, needed } = a.overall;
    return cardShell('Graduation progress',
      h('div', { class: 'edr-row' },
        h('p', { class: 'edr-big' }, String(taken), h('span', { class: 'edr-big-unit' }, 'of ' + required + ' units')),
        a.outcome ? h('span', { class: 'edr-tag ' + (a.outcome === 'Satisfied' ? 'is-ok' : 'is-warn') }, a.outcome) : null),
      EDR.ui.bar(taken, required),
      h('p', { class: 'edr-muted' }, needed > 0 ? needed + ' units still needed to graduate.' : 'All units completed.'),
      a.requirements.length ? h('ul', { class: 'edr-reqs' }, a.requirements.map((r) =>
        h('li', { class: 'edr-req' },
          h('div', { class: 'edr-row' },
            h('span', { class: 'edr-req-label' }, r.label),
            h('span', { class: 'edr-tag ' + (r.needed > 0 ? 'is-warn' : 'is-ok') }, r.needed > 0 ? r.needed + ' needed' : 'Done')),
          EDR.ui.bar(r.taken, r.required),
          h('span', { class: 'edr-muted edr-small' }, r.taken + ' of ' + r.required + ' units')))) : null);
  }

  function resultsCard(r) {
    const graded = r.courses.filter((c) => /^[A-DF][+-]?$/.test(c.grade));
    const units = r.courses.reduce((s, c) => s + c.units, 0);
    return cardShell(r.term ? 'Results · ' + r.term : 'Results',
      h('div', { class: 'edr-stats' },
        r.cumulativeGpa != null ? stat(r.cumulativeGpa.toFixed(2), 'Cumulative GPA') : null,
        r.termGpa != null ? stat(r.termGpa.toFixed(2), 'Semester GPA') : null,
        stat(String(units), 'Units this semester'),
        stat(graded.length + ' / ' + r.courses.length, 'Graded courses')),
      h('ul', { class: 'edr-chips' }, r.courses.map((c) =>
        h('li', { class: 'edr-chip' }, h('span', { class: 'edr-mono' }, c.code), ' ', c.title, ' ', h('strong', null, c.grade)))),
      r.standing ? h('p', { class: 'edr-muted' }, 'Academic standing: ' + r.standing) : null);
  }

  function classesCard(c) {
    const count = c.courses.reduce((s, m) => s + m.classes.length, 0);
    return cardShell(c.term ? 'Your classes · ' + c.term : 'Your classes',
      h('p', { class: 'edr-muted' }, c.courses.length + ' courses · ' + count + ' classes'),
      h('ul', { class: 'edr-list' }, c.courses.map((m) =>
        h('li', null,
          h('span', null, h('span', { class: 'edr-mono' }, m.code), ' ', m.title),
          h('span', { class: 'edr-muted' }, m.classes.map((k) => k.type + ' ' + k.group).join(' · '))))));
  }

  function aidCard(f) {
    const last = f.rows[f.rows.length - 1];
    return cardShell('Financial aid',
      h('div', { class: 'edr-stats' },
        stat(EDR.ui.sgd(f.total), 'Total disbursed'),
        stat(String(f.rows.length), 'Disbursements'),
        stat(EDR.ui.sgd(last.amount), 'Latest · ' + last.posted)),
      h('p', { class: 'edr-muted' }, last.name));
  }

  function stat(value, label) {
    return h('div', { class: 'edr-stat' }, h('span', { class: 'edr-stat-value' }, value), h('span', { class: 'edr-stat-label' }, label));
  }

  function start() {
    const rerun = EDR.debounce(run, 500);
    run();
    new MutationObserver((records) => {
      const ours = (r) => {
        const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        return el && el.closest('.edr-root');
      };
      if (records.every(ours)) return;
      rerun();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  EDR.enhancers = { start, run };
})();
