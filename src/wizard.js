(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // One-click Overview setup. Visits each source page in turn, clicks into the
  // right view (page-list item, then the latest semester), waits until the
  // enhancer reports the summary, and moves on. It only ever clicks view links
  // named below, never buttons that submit anything.
  //
  // The run happens in a background tab (see background.js) while the Overview
  // shows progress and fills in live. If that tab can't be opened, it falls back
  // to running in the current tab with a progress bar.
  const STEPS = {
    results: { label: 'Exam results', tile: 'exams', nav: 'View Exam Results', pickTerm: true, wait: ['results'] },
    audit: { label: 'Graduation audit', tile: 'degree', nav: 'View Graduation Audit Report', wait: ['audit'] },
    timetable: { label: 'Timetable', tile: 'acadrec', nav: 'View Classes', pickTerm: true, wait: ['sessions', 'slots'], radio: { after: 'sessions', label: 'By Class' } },
    classes: { label: 'Class groups', tile: 'coursereg', nav: 'View My Classes@CourseReg', wait: ['classes'] }
  };
  const ORDER = ['results', 'audit', 'timetable', 'classes'];
  const STEP_TIMEOUT = 45000; // background tabs run slower
  const RUN_TTL = 10 * 60 * 1000; // a run left over from a closed tab or expired session is dropped
  const KEY = 'edr:wizard';

  const area = () => chrome.storage.local;
  const getState = async () => (await area().get(KEY))[KEY] || null;
  const setState = (s) => (s ? area().set({ [KEY]: s }) : area().remove(KEY));

  const send = (msg) => new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(msg, (res) => resolve(chrome.runtime.lastError ? null : res));
    } catch (e) { resolve(null); }
  });

  async function start(keys) {
    const queue = (keys && keys.length ? keys : ORDER).filter((k) => STEPS[k]);
    const state = { id: Date.now(), queue, i: 0, outcome: {}, stepAt: Date.now(), bg: true };
    await setState(state);
    const res = await send({ type: 'collect:start', path: EDR.routes.byId[STEPS[queue[0]].tile].path });
    if (res && res.ok) return;
    state.bg = false;
    await setState(state);
    go(state);
  }

  // Lets the Overview follow a run happening in another tab.
  function onChange(fn) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && KEY in changes) fn(changes[KEY].newValue || null, changes[KEY].oldValue || null);
    });
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
      await EDR.store.setPrefs({ wizardJustFinished: Date.now(), lastWizard: state.outcome });
      await setState(null);
      if (state.bg) send({ type: 'collect:end' });
      else location.href = EDR.routes.HOME + '#overview';
      return;
    }
    await setState(state);
    go(state);
  }

  async function stop() {
    const state = await getState();
    await setState(null);
    if (state && state.bg) send({ type: 'collect:end' });
    const bar = document.getElementById('edr-wizard');
    if (bar) bar.remove();
  }

  // Called on every EduRec page load (top frame). Continues an active run.
  async function resume(page) {
    const state = await getState();
    if (!state || !EDR.isTop) return;
    if (!state.id || Date.now() - state.stepAt > RUN_TTL) { await setState(null); return; }
    // A background run only continues in its own tab, never in the student's.
    if (state.bg) {
      const res = await send({ type: 'collect:whoami' });
      if (!res || !res.collector) return;
    }
    const key = state.queue[state.i];
    const step = STEPS[key];
    if (!step) { await stop(); return; }
    if (!state.bg) mountBar(state, step);

    if (page.key !== step.tile) {
      // Landed somewhere else (EduRec redirected): head to the step's page once.
      const guard = 'edr-wizard-redirected-' + state.id + '-' + key;
      if (!sessionStorage.getItem(guard)) {
        sessionStorage.setItem(guard, '1');
        go(state);
      }
      return;
    }

    // EduRec ignores clicks that land while it is still starting up (and a
    // background tab starts up slowly), then shows its default page. So each
    // click waits for EduRec to be idle, is checked, and is retried if it didn't
    // take, instead of being fired once.
    const begun = Date.now();
    const tries = { nav: 0, term: 0, radio: 0 };
    const lastClick = { nav: 0, term: 0, radio: 0 };
    let quietSince = 0;
    const act = (kind, el, gap, max) => {
      if (tries[kind] >= max || Date.now() - lastClick[kind] < gap) return false;
      tries[kind] += 1;
      lastClick[kind] = Date.now();
      quietSince = 0;
      el.click();
      return true;
    };
    const timer = setInterval(async () => {
      const seen = await EDR.store.getSeen();
      const got = (k) => (seen[k] || 0) >= state.stepAt;
      if (step.wait.every(got)) { clearInterval(timer); setBar('Got it', true); setTimeout(() => advance('done'), 450); return; }
      if (Date.now() - begun > STEP_TIMEOUT) { clearInterval(timer); advance(step.wait.some(got) ? 'done' : 'skipped'); return; }
      if (busy()) { quietSince = 0; return; }
      if (!quietSince) { quietSince = Date.now(); return; }
      if (Date.now() - quietSince < 900) return;

      if (step.nav) {
        const link = navLink(step.nav);
        if (!link) return;
        const li = link.closest('li');
        if (li && !li.classList.contains('psc_selected')) { act('nav', link, 2500, 5); return; }
      }
      if (step.pickTerm && !step.wait.some(got)) {
        const term = termLink();
        if (term) { act('term', term, 3500, 4); return; }
      }
      if (step.radio && got(step.radio.after) && !step.wait.every(got)) {
        const label = [...document.querySelectorAll('#PT_MAIN label')].find((l) => l.textContent.trim() === step.radio.label);
        if (label) act('radio', label, 3500, 4);
      }
    }, 500);
  }

  // The latest semester in the page's term list (EduRec lists newest first). Ids
  // differ between pages (TERM$0, SSR_ENTRMCUR_VW_TERM_DESCR30$0), so match text.
  const TERM_TEXT = /^\d{4}\/\d{4} (Semester \d|Special Term)/;
  function termLink() {
    return [...document.querySelectorAll('#PT_MAIN a')].find((a) => TERM_TEXT.test(a.textContent.trim())) || null;
  }

  // EduRec shows #processing while it works; clicks during that are dropped.
  function busy() {
    if (document.readyState !== 'complete') return true;
    const p = document.getElementById('processing');
    if (!p) return false;
    const cs = getComputedStyle(p);
    return cs.visibility !== 'hidden' && cs.display !== 'none';
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

  EDR.wizard = { start, stop, resume, onChange, getState, STEPS, ORDER };
})();
