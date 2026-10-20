(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // Replaces the tile homepage with a dashboard built from snapshots saved as
  // the student browses (see enhancers.js). Optional: setup never blocks, and the
  // whole page can be turned off in the popup.
  let prefs = {};
  let lastData = {};
  let rootEl = null;

  async function mount(initialPrefs) {
    if (document.getElementById('edr-overview')) return;
    prefs = initialPrefs || (await EDR.store.getPrefs());
    EDR.flag('home');
    rootEl = h('main', { id: 'edr-overview', class: 'edr-root edr-page' });
    document.body.append(rootEl);
    lastData = await EDR.store.getData();
    render();
    EDR.store.onDataChange((data) => { lastData = data; render(); });
    if (prefs.wizardJustFinished && Date.now() - prefs.wizardJustFinished < 60000) {
      showFinished(prefs.lastWizard || {});
      EDR.store.setPrefs({ wizardJustFinished: 0 });
    }
  }

  function render() {
    const { termFor, byId } = EDR.routes;
    const data = lastData;
    const now = new Date();
    const term = termFor(now);
    // replaceChildren would print a null child as the text "null"; drop empty sections.
    rootEl.replaceChildren(...[
      h('header', { class: 'edr-page-head' },
        h('p', { class: 'edr-muted' }, now.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' · AY' + term.ay + ' ' + term.label),
        h('h1', { class: 'edr-h1' }, 'Overview')),
      setupPrompt(data),
      h('section', { class: 'edr-grid', 'aria-label': 'Summary' },
        gpaCard(data.results, byId.exams.path),
        degreeCard(data.audit, byId.degree.path),
        classesCard(data.classes, byId.coursereg.path)),
      shortcuts(),
      h('p', { class: 'edr-fineprint' }, 'Summaries are read from EduRec pages and kept in this browser only. Turn the Overview off from the extension’s toolbar button.')
    ].filter(Boolean));
  }

  function card(title, href, updated, ...body) {
    return h('article', { class: 'edr-card' },
      h('div', { class: 'edr-card-head' },
        h('h2', { class: 'edr-h2' }, title),
        h('a', { href, class: 'edr-card-link' }, 'Open')),
      ...body,
      updated ? h('p', { class: 'edr-updated', title: EDR.fmtDate(updated) }, 'Updated ' + EDR.ago(updated)) : null);
  }

  // Empty card: one click collects just this summary.
  function empty(key, text) {
    return h('div', { class: 'edr-empty' },
      h('p', null, text),
      h('button', { type: 'button', class: 'edr-btn is-small', onclick: () => EDR.wizard.start([key]) },
        EDR.icon('M12 5v10M7 10l5 5 5-5M5 19h14', 16), 'Collect'));
  }

  const KEYS = ['results', 'audit', 'classes'];

  function setupPrompt(data) {
    const missing = KEYS.filter((k) => !data[k]);
    if (!missing.length || prefs.setupDismissed) return null;
    const dismiss = () => { prefs.setupDismissed = true; EDR.store.setPrefs({ setupDismissed: true }); render(); };
    if (missing.length === KEYS.length) {
      return h('section', { class: 'edr-setup', 'aria-labelledby': 'edr-setup-title' },
        h('div', { class: 'edr-setup-copy' },
          h('h2', { class: 'edr-h2', id: 'edr-setup-title' }, 'Set up your Overview'),
          h('p', { class: 'edr-muted' }, 'One click reads your exam results, degree audit and classes from EduRec. It takes about 20 seconds and never submits anything.')),
        h('div', { class: 'edr-setup-actions' },
          h('button', { type: 'button', class: 'edr-btn', onclick: () => EDR.wizard.start() }, 'Set up Overview'),
          h('button', { type: 'button', class: 'edr-btn is-ghost', onclick: dismiss }, 'Not now')));
    }
    return h('section', { class: 'edr-setup is-compact', 'aria-label': 'Overview setup' },
      h('p', { class: 'edr-setup-line' },
        h('strong', null, (KEYS.length - missing.length) + ' of ' + KEYS.length + ' summaries ready.'), ' ',
        missing.map((k) => EDR.wizard.STEPS[k].label).join(', ') + ' still to collect.'),
      h('div', { class: 'edr-setup-actions' },
        h('button', { type: 'button', class: 'edr-btn is-small', onclick: () => EDR.wizard.start(missing) }, 'Collect the rest'),
        h('button', { type: 'button', class: 'edr-icon-btn is-dark', 'aria-label': 'Dismiss', title: 'Dismiss', onclick: dismiss },
          EDR.icon('M6 6l12 12M18 6L6 18', 16))));
  }

  // Short, proportional confirmation when the setup run lands back here.
  function showFinished(outcome) {
    const keys = Object.keys(outcome);
    const done = keys.filter((k) => outcome[k] === 'done').length;
    const skipped = keys.filter((k) => outcome[k] !== 'done').map((k) => EDR.wizard.STEPS[k].label.toLowerCase());
    const toast = h('div', { class: 'edr-root edr-toast', role: 'status' },
      EDR.icon('M5 12.5l4.5 4.5L19 7.5', 18),
      h('span', null, done === keys.length
        ? 'Overview ready. ' + done + (done === 1 ? ' summary' : ' summaries') + ' collected.'
        : done + ' of ' + keys.length + ' collected. Couldn’t read ' + skipped.join(', ') + '; try Collect on that card.'));
    document.documentElement.append(toast);
    setTimeout(() => toast.classList.add('is-leaving'), 5200);
    setTimeout(() => toast.remove(), 5600);
  }

  function gpaCard(snap, href) {
    const r = snap && snap.value;
    if (!r || r.cumulativeGpa == null) {
      return card('Results', href, null, empty('results', 'Your GPA and latest grades, read from View Exam Results.'));
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
      return card('Degree progress', href, null, empty('audit', 'Units done and what’s left, read from your graduation audit.'));
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
      return card('This semester', href, null, empty('classes', 'Your courses and class groups, read from My Classes.'));
    }
    const classCount = c.courses.reduce((n, m) => n + m.classes.length, 0);
    return card('This semester', href, snap.at,
      h('p', { class: 'edr-big' }, String(c.courses.length), h('span', { class: 'edr-big-unit' }, (c.courses.length === 1 ? 'course · ' : 'courses · ') + classCount + (classCount === 1 ? ' class' : ' classes'))),
      c.term ? h('p', { class: 'edr-muted' }, c.term) : null,
      h('ul', { class: 'edr-list' }, c.courses.map((m) =>
        h('li', null,
          h('span', { class: 'edr-list-label' }, h('span', { class: 'edr-mono' }, m.code), ' ', m.title),
          h('span', { class: 'edr-muted' }, m.classes.map((k) => k.type + ' ' + k.group).join(' · '))))));
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
