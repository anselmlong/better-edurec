(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // Replaces the tile homepage with a dashboard built from snapshots saved as
  // the student browses (see enhancers.js). Shows how to fill any empty card.
  async function mount() {
    if (document.getElementById('edr-overview')) return;
    EDR.flag('home');
    const root = h('main', { id: 'edr-overview', class: 'edr-root edr-page' });
    document.body.append(root);
    render(root, await EDR.store.getData());
    EDR.store.onDataChange((data) => render(root, data));
  }

  function render(root, data) {
    const { termFor, byId } = EDR.routes;
    const now = new Date();
    const term = termFor(now);
    root.replaceChildren(
      h('header', { class: 'edr-page-head' },
        h('p', { class: 'edr-muted' }, now.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · AY' + term.ay + ' ' + term.label),
        h('h1', { class: 'edr-h1' }, 'Overview')),
      setupStrip(data),
      h('section', { class: 'edr-grid', 'aria-label': 'Summary' },
        gpaCard(data.results, byId.exams.path),
        degreeCard(data.audit, byId.degree.path),
        classesCard(data.classes, byId.coursereg.path),
        aidCard(data.finaid, byId.finaid.path)),
      shortcuts(),
      h('p', { class: 'edr-fineprint' }, 'Summaries are saved in this browser only, each time you open the matching EduRec page.')
    );
  }

  function card(title, href, updated, ...body) {
    return h('article', { class: 'edr-card' },
      h('div', { class: 'edr-card-head' },
        h('h2', { class: 'edr-h2' }, title),
        h('a', { href, class: 'edr-card-link' }, 'Open')),
      ...body,
      updated ? h('p', { class: 'edr-updated', title: EDR.fmtDate(updated) }, 'Updated ' + EDR.ago(updated)) : null);
  }

  function empty(text, href, linkText) {
    return h('div', { class: 'edr-empty' },
      h('p', null, text),
      h('a', { href, class: 'edr-empty-link' }, linkText, EDR.icon('M9 6l6 6-6 6', 16)));
  }

  // First-use checklist: the Overview fills itself as the student opens four
  // EduRec pages once. It disappears when all four have been collected.
  const STEPS = [
    { key: 'results', label: 'A semester of exam results', tile: 'exams' },
    { key: 'audit', label: 'Your graduation audit report', tile: 'degree' },
    { key: 'classes', label: 'My classes in Course registration', tile: 'coursereg' },
    { key: 'finaid', label: 'Financial aid', tile: 'finaid' }
  ];

  function setupStrip(data) {
    const done = STEPS.filter((s) => data[s.key]).length;
    if (done === STEPS.length) return null;
    return h('section', { class: 'edr-setup', 'aria-labelledby': 'edr-setup-title' },
      h('div', { class: 'edr-setup-head' },
        h('h2', { class: 'edr-h2', id: 'edr-setup-title' }, 'Fill your Overview'),
        h('span', { class: 'edr-muted' }, done + ' of ' + STEPS.length + ' collected')),
      h('p', { class: 'edr-muted' }, 'Open each of these pages once. The reskin reads them as you browse and keeps a summary here.'),
      h('ol', { class: 'edr-steps' }, STEPS.map((s) => {
        const ok = !!data[s.key];
        return h('li', { class: 'edr-step' + (ok ? ' is-done' : '') },
          h('span', { class: 'edr-step-dot', 'aria-hidden': 'true' }, ok ? EDR.icon('M5 12.5l4.5 4.5L19 7.5', 14) : null),
          ok ? h('span', null, s.label) : h('a', { href: EDR.routes.byId[s.tile].path }, s.label),
          h('span', { class: 'edr-visually-hidden' }, ok ? ' (collected)' : ' (not yet)'));
      })));
  }

  function gpaCard(snap, href) {
    const r = snap && snap.value;
    if (!r || r.cumulativeGpa == null) {
      return card('Results', href, null, empty('Open any semester under Examinations › View exam results to show your GPA here.', href, 'Go to Examinations'));
    }
    return card('Results', href, snap.at,
      h('p', { class: 'edr-big' }, r.cumulativeGpa.toFixed(2), h('span', { class: 'edr-big-unit' }, 'cumulative GPA')),
      h('p', { class: 'edr-muted' }, [r.term, r.standing].filter(Boolean).join(' · ')),
      r.courses.length ? h('ul', { class: 'edr-chips' }, r.courses.map((c) =>
        h('li', { class: 'edr-chip' }, h('span', { class: 'edr-mono' }, c.code), ' ', h('strong', null, c.grade)))) : null);
  }

  function degreeCard(snap, href) {
    const a = snap && snap.value;
    if (!a || !a.overall) {
      return card('Degree progress', href, null, empty('Open Degree progress › View graduation audit report to track your units here.', href, 'Go to Degree progress'));
    }
    const { required, taken, needed } = a.overall;
    const open = a.requirements.filter((r) => r.needed > 0).slice(0, 3);
    return card('Degree progress', href, snap.at,
      h('p', { class: 'edr-big' }, String(taken), h('span', { class: 'edr-big-unit' }, 'of ' + required + ' units')),
      EDR.ui.bar(taken, required),
      h('p', { class: needed > 0 ? 'edr-muted' : 'edr-done-line' }, needed > 0 ? needed + ' units still needed' : 'Every unit is in. Apply for graduation when the window opens.'),
      open.length ? h('ul', { class: 'edr-list' }, open.map((r) =>
        h('li', null, h('span', { class: 'edr-list-label' }, r.label), h('span', { class: 'edr-tag is-warn' }, r.needed + ' needed')))) : null);
  }

  function classesCard(snap, href) {
    const c = snap && snap.value;
    if (!c || !c.courses.length) {
      return card('This semester', href, null, empty('Open Course registration › View my classes to list your classes here.', href, 'Go to Course registration'));
    }
    return card('This semester', href, snap.at,
      c.term ? h('p', { class: 'edr-muted' }, c.term) : null,
      h('ul', { class: 'edr-list' }, c.courses.map((m) =>
        h('li', null,
          h('span', { class: 'edr-list-label' }, h('span', { class: 'edr-mono' }, m.code), ' ', m.title),
          h('span', { class: 'edr-muted' }, m.classes.map((k) => k.type + ' ' + k.group).join(' · '))))));
  }

  function aidCard(snap, href) {
    const f = snap && snap.value;
    if (!f || !f.rows.length) {
      return card('Financial aid', href, null, empty('Open Financial aid to show your disbursements here.', href, 'Go to Financial aid'));
    }
    const last = f.rows[f.rows.length - 1];
    return card('Financial aid', href, snap.at,
      h('p', { class: 'edr-big' }, EDR.ui.sgd(last.amount), h('span', { class: 'edr-big-unit' }, 'latest')),
      h('p', { class: 'edr-muted' }, last.name + ' · ' + last.term + ' · posted ' + last.posted),
      h('p', { class: 'edr-muted' }, f.rows.length + ' disbursements · ' + EDR.ui.sgd(f.total) + ' in total'));
  }

  function shortcuts() {
    const { TILES, SECTIONS } = EDR.routes;
    const groups = SECTIONS.filter((s) => s.id !== 'home').map((s) => ({
      label: s.label,
      tiles: TILES.filter((t) => t.section === s.id)
    })).filter((g) => g.tiles.length);
    return h('section', { class: 'edr-shortcuts', 'aria-labelledby': 'edr-all' },
      h('h2', { class: 'edr-h2', id: 'edr-all' }, 'All of EduRec'),
      h('div', { class: 'edr-shortcut-grid' }, groups.map((g) =>
        h('div', { class: 'edr-shortcut-group' },
          h('h3', { class: 'edr-h3' }, g.label),
          h('ul', null, g.tiles.map((t) => h('li', null, h('a', { href: t.path }, t.label))))))));
  }

  EDR.overview = { mount };
})();
