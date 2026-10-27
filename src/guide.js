(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // Guided setup. The student opens each source page themselves from the
  // Overview's checklist; a small coach card on that page says what to click
  // next, highlights it, and confirms once the summary is saved. The extension
  // never clicks for them (EduRec drops clicks while it is busy, which made an
  // automated run unreliable); it only opens the right sub-page, like the quick
  // links do.
  const STEPS = {
    results: { label: 'Exam results', tile: 'exams', nav: 'View Exam Results', keys: ['results'],
      about: 'Your GPA and grades', pickTerm: 'Pick the latest semester.' },
    audit: { label: 'Graduation audit', tile: 'degree', nav: 'View Graduation Audit Report', keys: ['audit'],
      about: 'Units done and what’s left' },
    timetable: { label: 'Timetable', tile: 'acadrec', nav: 'View Classes', keys: ['sessions', 'slots'],
      about: 'Your classes this week', pickTerm: 'Pick this semester.',
      radio: { after: 'sessions', label: 'By Class', hint: 'Now choose By Class, so each class gets its end time.' } },
    classes: { label: 'Class groups', tile: 'coursereg', nav: 'View My Classes@CourseReg', keys: ['classes'],
      about: 'Lets you open your timetable in NUSMods', optional: true }
  };
  // The Overview's checklist. Class groups is a step too, but only the timetable
  // card's NUSMods link starts it.
  const ORDER = ['results', 'audit', 'timetable'];
  const KEY = 'edr:guide';
  const TTL = 20 * 60 * 1000;
  const STEP_FOR = { results: 'results', audit: 'audit', sessions: 'timetable', slots: 'timetable', classes: 'classes' };

  const href = (key) => EDR.routes.shortcutHref({ tile: STEPS[key].tile, open: STEPS[key].nav });
  const isStepLabel = (label) => Object.values(STEPS).some((s) => s.nav === label);
  const isDone = (key, data) => STEPS[key].keys.every((k) => data && data[k]);

  function begin(key) {
    try { sessionStorage.setItem(KEY, JSON.stringify({ key, at: Date.now() })); } catch (e) { /* storage blocked */ }
  }
  function current() {
    try {
      const g = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      return g && STEPS[g.key] && Date.now() - g.at < TTL ? g : null;
    } catch (e) { return null; }
  }
  const end = () => { try { sessionStorage.removeItem(KEY); } catch (e) { /* storage blocked */ } };

  // A link that opens a step's page and starts its coach card there.
  function link(key, attrs, ...kids) {
    return h('a', Object.assign({ href: href(key), onclick: () => begin(key) }, attrs), ...kids);
  }

  // The next step still missing data, after `from` (wrapping is not needed: the
  // checklist always starts from the top).
  function nextMissing(data, from) {
    const i = ORDER.indexOf(from);
    return ORDER.slice(i + 1).find((k) => !isDone(k, data)) || null;
  }

  // ---- Coach card on the step's page (top frame) ----

  const TERM_TEXT = /^\d{4}\/\d{4} (Semester \d|Special Term)/;
  const termLink = () => [...document.querySelectorAll('#PT_MAIN a')].find((a) => TERM_TEXT.test(a.textContent.trim())) || null;
  const navLink = (label) => [...document.querySelectorAll('ul.psa_list-linkmenu a')].find((a) => a.textContent.trim() === label) || null;
  const radioLabel = (label) => [...document.querySelectorAll('#PT_MAIN label')].find((l) => l.textContent.trim() === label) || null;

  // Marks the thing to click next. Rings the whole row or card it sits in (a
  // ring around just the link text looks cramped) and labels it.
  let target = null;
  function point(el, hint) {
    const box = el && (el.closest('li.ps_grid-row, tr.ps_grid-row, ul.psa_list-linkmenu > li') || el);
    if (target === box) return;
    if (target) { target.classList.remove('edr-coach-target'); target.removeAttribute('data-edr-hint'); }
    target = box;
    if (box) {
      box.classList.add('edr-coach-target');
      if (hint) box.setAttribute('data-edr-hint', hint);
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  async function resume(page) {
    const g = current();
    if (!g || !EDR.isTop) return;
    if (page.key === 'home') { end(); return; }
    const step = STEPS[g.key];
    const n = ORDER.indexOf(g.key) + 1;

    const title = h('strong', { class: 'edr-coach-title' });
    const text = h('p', { class: 'edr-coach-text' });
    const actions = h('div', { class: 'edr-coach-actions' });
    const close = () => { end(); point(null); clearInterval(timer); card.classList.add('is-leaving'); setTimeout(() => card.remove(), 200); };
    const card = h('aside', { class: 'edr-root edr-coach', role: 'status', 'aria-live': 'polite', 'aria-label': 'Overview setup' },
      h('div', { class: 'edr-coach-head' },
        h('span', { class: 'edr-coach-step' }, step.optional ? 'Optional' : 'Step ' + n + ' of 3'),
        h('button', { type: 'button', class: 'edr-icon-btn is-dark', 'aria-label': 'Close', title: 'Close', onclick: close }, EDR.icon('M6 6l12 12M18 6L6 18', 14))),
      title, text, actions);
    document.documentElement.append(card);

    let shown = '';
    const show = (state, t, body, acts) => {
      if (shown === state) return;
      shown = state;
      card.classList.toggle('is-done', state === 'done');
      title.textContent = t;
      text.replaceChildren(...[].concat(body));
      actions.replaceChildren(...(acts || []));
    };

    const timer = setInterval(async () => {
      const seen = await EDR.store.getSeen();
      const got = (k) => (seen[k] || 0) >= g.at;
      if (step.keys.every(got)) {
        clearInterval(timer);
        point(null);
        end();
        const data = await EDR.store.getData();
        const next = nextMissing(data, g.key);
        show('done', step.label + ' saved', next ? 'It’s on your Overview now.' : 'Your Overview is ready.', [
          next ? link(next, { class: 'edr-btn is-small' }, 'Next: ' + STEPS[next].label, EDR.icon('M5 12h14M13 6l6 6-6 6', 14)) : null,
          h('a', { class: 'edr-btn is-small' + (next ? ' is-ghost' : ''), href: EDR.routes.HOME + '#overview' }, 'Back to Overview')
        ].filter(Boolean));
        return;
      }
      if (step.radio && got(step.radio.after)) {
        const label = radioLabel(step.radio.label);
        point(label, 'Choose this');
        show('radio', 'Almost there', step.radio.hint);
        return;
      }
      const nav = step.nav && navLink(step.nav);
      const li = nav && nav.closest('li');
      if (nav && li && !li.classList.contains('psc_selected')) {
        point(nav, 'Open this');
        show('nav', step.label, ['Choose ', h('strong', null, step.nav), ' in the list on the left.']);
        return;
      }
      const term = step.pickTerm && termLink();
      if (term) {
        point(term, 'Pick this');
        show('term', step.label, step.pickTerm);
        return;
      }
      point(null);
      show('wait', step.label, 'Reading this page…');
    }, 600);
  }

  EDR.guide = { STEPS, ORDER, STEP_FOR, href, link, begin, isDone, isStepLabel, nextMissing, resume };
})();
