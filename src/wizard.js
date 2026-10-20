(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // One-click Overview setup. Visits each source page in turn, clicks into the
  // right view (page-list item, then the latest semester), waits until the
  // enhancer reports the summary, and moves on. It only ever clicks view links
  // named below, never buttons that submit anything.
  const STEPS = {
    results: { label: 'Exam results', tile: 'exams', nav: 'View Exam Results', pickTerm: true },
    audit: { label: 'Graduation audit', tile: 'degree', nav: 'View Graduation Audit Report' },
    classes: { label: 'My classes', tile: 'coursereg', nav: 'View My Classes@CourseReg' },
    finaid: { label: 'Financial aid', tile: 'finaid' }
  };
  const ORDER = ['results', 'audit', 'classes', 'finaid'];
  const STEP_TIMEOUT = 25000;
  const KEY = 'edr:wizard';

  const area = () => chrome.storage.local;
  const getState = async () => (await area().get(KEY))[KEY] || null;
  const setState = (s) => (s ? area().set({ [KEY]: s }) : area().remove(KEY));

  async function start(keys) {
    const queue = (keys && keys.length ? keys : ORDER).filter((k) => STEPS[k]);
    const state = { queue, i: 0, outcome: {}, stepAt: Date.now(), origin: location.href };
    await setState(state);
    go(state);
  }

  function go(state) {
    const step = STEPS[state.queue[state.i]];
    location.href = EDR.routes.byId[step.tile].path;
  }

  async function advance(result) {
    const state = await getState();
    if (!state) return;
    state.outcome[state.queue[state.i]] = result;
    state.i += 1;
    state.stepAt = Date.now();
    if (state.i >= state.queue.length) {
      await setState(null);
      await EDR.store.setPrefs({ wizardJustFinished: Date.now(), lastWizard: state.outcome });
      location.href = EDR.routes.HOME + '#overview';
      return;
    }
    await setState(state);
    go(state);
  }

  async function stop() {
    await setState(null);
    const bar = document.getElementById('edr-wizard');
    if (bar) bar.remove();
  }

  // Called on every EduRec page load (top frame). Continues an active run.
  async function resume(page) {
    const state = await getState();
    if (!state || !EDR.isTop) return;
    const key = state.queue[state.i];
    const step = STEPS[key];
    if (!step) { await stop(); return; }
    mountBar(state, step);

    if (page.key !== step.tile) {
      // Landed somewhere else (EduRec redirected): head to the step's page once.
      if (!sessionStorage.getItem('edr-wizard-redirected-' + key)) {
        sessionStorage.setItem('edr-wizard-redirected-' + key, '1');
        go(state);
      }
      return;
    }

    const clicked = new Set();
    const begun = Date.now();
    const timer = setInterval(async () => {
      const seen = (await EDR.store.getSeen())[key] || 0;
      if (seen >= state.stepAt) { clearInterval(timer); setBar('Got it', true); setTimeout(() => advance('done'), 450); return; }
      if (Date.now() - begun > STEP_TIMEOUT) { clearInterval(timer); advance('skipped'); return; }
      if (step.nav && !clicked.has('nav')) {
        const link = navLink(step.nav);
        if (link) {
          clicked.add('nav');
          const li = link.closest('li');
          if (!li || !li.classList.contains('psc_selected')) link.click();
          return;
        }
      }
      if (step.pickTerm && !clicked.has('term')) {
        const term = document.querySelector('a[id^="TERM$"]');
        if (term) { clicked.add('term'); term.click(); }
      }
    }, 700);
  }

  function navLink(label) {
    const links = document.querySelectorAll('ul.psa_list-linkmenu a.ps-link, ul.psa_list-linkmenu a');
    for (const a of links) if (a.textContent.trim() === label) return a;
    return null;
  }

  function mountBar(state, step) {
    if (document.getElementById('edr-wizard')) return;
    const segs = state.queue.map((k, i) => h('span', {
      class: 'edr-wiz-seg' + (i < state.i ? ' is-done' : i === state.i ? ' is-now' : ''),
      title: STEPS[k].label
    }));
    const bar = h('div', { id: 'edr-wizard', class: 'edr-root edr-wizard', role: 'status', 'aria-live': 'polite' },
      h('div', { class: 'edr-wiz-text' },
        h('strong', null, 'Setting up your Overview'),
        h('span', { class: 'edr-wiz-step' }, 'Step ' + (state.i + 1) + ' of ' + state.queue.length + ': reading ' + step.label.toLowerCase() + '…')),
      h('div', { class: 'edr-wiz-segs', 'aria-hidden': 'true' }, segs),
      h('div', { class: 'edr-wiz-actions' },
        h('button', { type: 'button', class: 'edr-wiz-btn', onclick: () => advance('skipped') }, 'Skip step'),
        h('button', { type: 'button', class: 'edr-wiz-btn is-quiet', onclick: stop }, 'Stop')));
    document.documentElement.append(bar);
  }

  function setBar(text, ok) {
    const el = document.querySelector('#edr-wizard .edr-wiz-step');
    if (el) el.textContent = text;
    const now = document.querySelector('#edr-wizard .edr-wiz-seg.is-now');
    if (ok && now) now.classList.add('is-done');
  }

  EDR.wizard = { start, stop, resume, STEPS, ORDER };
})();
