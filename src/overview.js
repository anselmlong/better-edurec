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
  let run = null;          // the setup run in progress, if any (wizard state)
  let filledBefore = null; // summary keys that had data at the previous render

  async function mount(initialPrefs) {
    if (document.getElementById('edr-overview')) return;
    prefs = initialPrefs || (await EDR.store.getPrefs());
    EDR.flag('home');
    rootEl = h('main', { id: 'edr-overview', class: 'edr-root edr-page' });
    document.body.append(rootEl);
    lastData = await EDR.store.getData();
    run = live(await EDR.wizard.getState());
    render();
    // After the first paint, re-renders (new data, setup progress) don't replay
    // entrance motion; only a card that just received its data animates in.
    setTimeout(() => rootEl.setAttribute('data-settled', ''), 1200);
    EDR.store.onDataChange((data) => { lastData = data; render(); });
    EDR.wizard.onChange(async (next, prev) => {
      run = live(next);
      render();
      if (!next && prev) {
        const p = await EDR.store.getPrefs();
        if (p.wizardJustFinished && Date.now() - p.wizardJustFinished < 60000) {
          showFinished(p.lastWizard || {});
          EDR.store.setPrefs({ wizardJustFinished: 0 });
        }
      }
    });
    // Live: keep "Up next" and the now-line current without re-running entrance motion.
    setInterval(renderLive, 30000);
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
      quickLinks(),
      run ? progressCard(run) : setupPrompt(data),
      h('section', { class: 'edr-grid', 'aria-label': 'Summary' },
        safe('Results', gpaCard, data.results, byId.exams.path, 'results'),
        safe('Degree progress', degreeCard, data.audit, byId.degree.path, 'audit'),
        h('div', { id: 'edr-upnext-slot', class: 'edr-slot' })),
      h('section', { id: 'edr-week-slot', class: 'edr-slot', 'aria-label': 'Timetable' }),
      h('p', { class: 'edr-fineprint' }, 'Summaries are read from EduRec pages and kept in this browser only. Turn the Overview off from the extension’s toolbar button.')
    ].filter(Boolean));
    renderLive();
    markArrivals();
  }

  // A wizard state counts only while fresh; one left by a closed tab is ignored.
  const live = (s) => (s && s.id && Date.now() - s.stepAt < 10 * 60 * 1000 ? s : null);

  // Cards whose summary just arrived get a one-off entrance.
  function markArrivals() {
    const filled = new Set(KEYS.filter((k) => lastData[k]));
    if (filledBefore) {
      for (const k of filled) {
        if (filledBefore.has(k)) continue;
        for (const el of rootEl.querySelectorAll('[data-key="' + k + '"]')) el.classList.add('is-arriving');
      }
    }
    filledBefore = filled;
  }

  // Setup running in a background tab: what's done, what's being read, what's next.
  function progressCard(s) {
    const { STEPS } = EDR.wizard;
    const now = STEPS[s.queue[s.i]];
    const ICON = { done: 'M5 12.5l4.5 4.5L19 7.5', skipped: 'M6 12h12' };
    return h('section', { class: 'edr-setup edr-collecting', role: 'status', 'aria-live': 'polite', 'aria-labelledby': 'edr-collect-title' },
      h('div', { class: 'edr-setup-copy' },
        h('h2', { class: 'edr-h2', id: 'edr-collect-title' }, now ? 'Reading your ' + now.label.toLowerCase() + '…' : 'Finishing up…'),
        h('p', { class: 'edr-muted' }, 'Step ' + Math.min(s.i + 1, s.queue.length) + ' of ' + s.queue.length + '. It runs in a background tab and only opens view pages, so you can keep using this one.')),
      h('ol', { class: 'edr-collect-steps' }, s.queue.map((k, i) => {
        const status = i < s.i ? (s.outcome[k] === 'done' ? 'done' : 'skipped') : i === s.i ? 'now' : 'todo';
        return h('li', { class: 'is-' + status },
          h('span', { class: 'edr-collect-dot', 'aria-hidden': 'true' }, ICON[status] ? EDR.icon(ICON[status], 12) : null),
          h('span', null, STEPS[k].label),
          h('span', { class: 'edr-visually-hidden' }, status === 'now' ? ' (reading)' : status === 'todo' ? ' (next)' : ' (' + status + ')'));
      })),
      h('div', { class: 'edr-setup-actions' },
        h('button', { type: 'button', class: 'edr-btn is-small is-ghost', onclick: () => EDR.wizard.stop() }, 'Stop')));
  }

  function card(title, href, updated, ...body) {
    return h('article', { class: 'edr-card' },
      h('div', { class: 'edr-card-head' },
        h('h2', { class: 'edr-h2' }, title),
        h('a', { href, class: 'edr-card-link' }, 'Open')),
      ...body,
      updated ? h('p', { class: 'edr-updated', title: EDR.fmtDate(updated) }, 'Updated ' + EDR.ago(updated)) : null);
  }

  // A malformed saved summary (older version, partial data) shows a recoverable
  // card instead of breaking the whole Overview.
  function safe(title, fn, snap, href, key) {
    try {
      const el = fn(snap, href);
      if (key) el.dataset.key = key;
      return el;
    } catch (err) {
      console.warn('[Better EduRec] could not show', title, err);
      return card(title, href, null, h('div', { class: 'edr-empty' },
        h('p', null, 'This summary couldn’t be shown. Collecting it again usually fixes it.')));
    }
  }

  // Empty card: one click collects just this summary.
  function empty(key, text) {
    // While setup is reading this summary, say so instead of offering a button.
    if (run && run.queue.includes(STEP_FOR[key])) {
      const reading = run.queue[run.i] === STEP_FOR[key];
      return h('div', { class: 'edr-empty is-waiting' + (reading ? ' is-reading' : '') },
        h('p', null, text),
        h('p', { class: 'edr-waiting-line' }, h('span', { class: 'edr-collect-dot', 'aria-hidden': 'true' }), reading ? 'Reading from EduRec…' : 'Queued'));
    }
    return h('div', { class: 'edr-empty' },
      h('p', null, text),
      h('button', { type: 'button', class: 'edr-btn is-small', onclick: () => EDR.wizard.start(stepsFor([key])) },
        EDR.icon('M12 5v10M7 10l5 5 5-5M5 19h14', 16), 'Collect'));
  }

  // Summary key -> the wizard step that collects it, and how the prompt names it.
  const KEYS = ['results', 'audit', 'sessions'];
  const STEP_FOR = { results: 'results', audit: 'audit', sessions: 'timetable', slots: 'timetable', classes: 'classes' };
  const NAME_FOR = { results: 'Exam results', audit: 'Graduation audit', sessions: 'Timetable' };
  const stepsFor = (keys) => [...new Set(keys.map((k) => STEP_FOR[k]))];

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
        missing.map((k) => NAME_FOR[k]).join(', ') + ' still to collect.'),
      h('div', { class: 'edr-setup-actions' },
        h('button', { type: 'button', class: 'edr-btn is-small', onclick: () => EDR.wizard.start(stepsFor(missing)) }, 'Collect the rest'),
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

  // ---- Quick links: one click to the sub-page people open most ----

  function quickLinks() {
    return h('nav', { class: 'edr-quick', 'aria-label': 'Quick links' },
      EDR.routes.SHORTCUTS.map((sc) => h('a', { class: 'edr-quick-link', href: EDR.routes.shortcutHref(sc) },
        EDR.icon(sc.icon, 16), h('span', null, sc.label))));
  }

  // ---- Live timetable: Up next card + this week's grid ----

  function schedule() {
    const s = lastData.sessions && lastData.sessions.value;
    if (!s || !s.sessions.length) return null;
    const slots = lastData.slots && lastData.slots.value;
    return { term: s.term, list: EDR.parsers.mergeSchedule(s.sessions, slots && slots.slots), at: lastData.sessions.at };
  }

  function renderLive() {
    const up = document.getElementById('edr-upnext-slot');
    const week = document.getElementById('edr-week-slot');
    if (!up || !week) return;
    const sch = schedule();
    try { up.replaceChildren(...[upNextCard(sch)].filter(Boolean)); if (up.firstChild) up.firstChild.dataset.key = 'sessions'; } catch (err) { console.warn('[Better EduRec] up next failed', err); }
    try { week.replaceChildren(...[weekSection(sch)].filter(Boolean)); if (week.firstChild) week.firstChild.dataset.key = 'sessions'; } catch (err) { console.warn('[Better EduRec] timetable failed', err); }
  }

  const fmtTime = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return ((h + 11) % 12 + 1) + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? ' am' : ' pm'); };
  const what = (s) => s.code + ' ' + s.type;

  function upNextCard(sch) {
    const href = EDR.routes.shortcutHref(EDR.routes.TIMETABLE_LINK);
    if (!sch) return card('Up next', href, null, empty('sessions', 'Your next class, its room and a countdown, read from View Classes.'));
    const { current, next } = EDR.timetable.nowAndNext(sch.list, new Date());
    if (!current && !next) {
      return card('Up next', href, sch.at, h('p', { class: 'edr-big' }, 'Done', h('span', { class: 'edr-big-unit' }, 'no more classes this term')));
    }
    const s = current || next;
    return card(current ? 'Happening now' : 'Up next', href, sch.at,
      h('p', { class: 'edr-big' }, current ? 'until ' + fmtTime(s.end) : fmtTime(s.start), h('span', { class: 'edr-big-unit' }, current ? '' : EDR.timetable.until(s, new Date()))),
      h('p', { class: 'edr-upnext-what' }, h('span', { class: 'edr-mono' }, s.code), ' ', s.type),
      h('p', { class: 'edr-muted' }, [s.room, new Date(s.date + 'T00:00').toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')),
      current && next ? h('p', { class: 'edr-muted' }, 'Then ' + what(next) + ' at ' + fmtTime(next.start)) : null);
  }

  const COURSE_COLORS = ['var(--edr-blue)', 'var(--edr-orange)', 'var(--edr-selected-ink)', 'var(--edr-warn)', 'var(--edr-navy)', 'var(--edr-muted)'];
  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // NUSMods-style grid: one row per day, hours across, a live now-line on today.
  function weekSection(sch) {
    const T = EDR.timetable;
    const head = (label, extra) => h('div', { class: 'edr-week-head' },
      h('h2', { class: 'edr-h2' }, label), h('div', { class: 'edr-week-actions' }, extra));
    if (!sch) return null;
    const now = new Date();
    const wk = T.weekToShow(sch.list, now);
    const exportBtn = lastData.classes
      ? h('button', { type: 'button', class: 'edr-btn is-small is-ghost', onclick: () => T.openInNusmods(lastData.classes) },
        'Open in NUSMods', EDR.icon('M7 17L17 7M9 7h8v8', 14))
      : h('button', { type: 'button', class: 'edr-btn is-small is-ghost', title: 'Needs your class groups from CourseReg', onclick: () => EDR.wizard.start(['classes']) },
        'Collect class groups for NUSMods');
    if (!wk) return h('div', { class: 'edr-card edr-week' }, head('This week', exportBtn), h('p', { class: 'edr-muted' }, 'No upcoming classes this term.'));

    const week = T.sessionsInWeek(sch.list, wk.monday);
    const codes = [...new Set(sch.list.map((s) => s.code))].sort();
    const color = (code) => COURSE_COLORS[codes.indexOf(code) % COURSE_COLORS.length];
    const dayIdx = (s) => (T.dateOf(s.date).getDay() + 6) % 7;
    const days = [0, 1, 2, 3, 4].concat([5, 6].filter((d) => week.some((s) => dayIdx(s) === d)));
    const startH = Math.min(8, ...week.map((s) => Math.floor(T.minutes(s.start) / 60)));
    const endH = Math.max(19, ...week.map((s) => Math.ceil(T.minutes(s.end) / 60)));
    const span = (endH - startH) * 60;
    const pct = (min) => ((min - startH * 60) / span) * 100 + '%';
    const todayIdx = T.isoOf(now) >= T.isoOf(wk.monday) ? (now.getDay() + 6) % 7 : -1;
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const showNow = wk.label === 'This week' && nowMin >= startH * 60 && nowMin <= endH * 60;

    const hours = [];
    for (let hh = startH; hh < endH; hh++) hours.push(h('span', { class: 'edr-week-hour', style: { left: pct(hh * 60) } }, fmtTime(String(hh).padStart(2, '0') + ':00').replace(' ', '')));

    const rows = days.map((d) => {
      const date = new Date(wk.monday); date.setDate(date.getDate() + d);
      const isToday = d === todayIdx && wk.label === 'This week';
      const items = week.filter((s) => dayIdx(s) === d);
      return h('div', { class: 'edr-week-row' + (isToday ? ' is-today' : '') },
        h('div', { class: 'edr-week-day' }, h('strong', null, DAY_NAMES[d]), h('span', null, String(date.getDate()))),
        h('div', { class: 'edr-week-track' },
          items.map((s) => {
            const past = s.date < T.isoOf(now) || (s.date === T.isoOf(now) && T.minutes(s.end) <= nowMin);
            return h('div', {
              class: 'edr-week-block' + (past ? ' is-past' : ''),
              style: { left: pct(T.minutes(s.start)), width: 'calc(' + (((T.minutes(s.end) - T.minutes(s.start)) / span) * 100) + '% - 3px)', '--c': color(s.code) },
              title: what(s) + ' · ' + fmtTime(s.start) + '–' + fmtTime(s.end) + (s.room ? ' · ' + s.room : '')
            }, h('span', { class: 'edr-mono' }, s.code), h('span', null, s.type + (s.room ? ' · ' + s.room : '')));
          }),
          isToday && showNow ? h('span', { class: 'edr-week-now', style: { left: pct(nowMin) }, 'aria-label': 'Now' }) : null));
    });

    return h('div', { class: 'edr-card edr-week' },
      head(wk.label, exportBtn),
      h('div', { class: 'edr-week-scroll' },
        h('div', { class: 'edr-week-grid' },
          h('div', { class: 'edr-week-hours' }, h('span', { class: 'edr-week-day' }), h('div', { class: 'edr-week-track' }, hours)),
          rows)),
      courseCards(sch.list, codes, color));
  }

  // One card per course: its weekly lessons (type, day, time, room), coloured like its grid blocks.
  function courseCards(list, codes, color) {
    const T = EDR.timetable;
    const titles = {};
    for (const key of ['classes', 'results']) {
      const v = lastData[key] && lastData[key].value;
      // CourseReg cuts titles at 30 characters; keep the longest version seen.
      for (const c of (v && v.courses) || []) if (c.title && c.title.length > (titles[c.code] || '').length) titles[c.code] = c.title;
    }
    const dayOrder = (s) => (T.dateOf(s.date).getDay() + 6) % 7;
    return h('ul', { class: 'edr-courses', 'aria-label': 'Courses this term' }, codes.map((code) => {
      const seen = new Map();
      for (const s of list.filter((x) => x.code === code)) {
        const key = s.type + dayOrder(s) + s.start;
        if (!seen.has(key)) seen.set(key, s);
      }
      const lessons = [...seen.values()].sort((a, b) => a.type.localeCompare(b.type) || dayOrder(a) - dayOrder(b) || a.start.localeCompare(b.start));
      return h('li', { class: 'edr-course', style: { '--c': color(code) } },
        h('div', { class: 'edr-course-head' },
          h('span', { class: 'edr-course-code' }, code),
          titles[code] ? h('span', { class: 'edr-course-title' }, titles[code]) : null),
        h('ul', { class: 'edr-course-lessons' }, lessons.map((s) => h('li', null,
          h('strong', null, s.type),
          h('span', { class: 'edr-course-when' }, DAY_NAMES[dayOrder(s)] + ' ' + fmtTime(s.start) + '–' + fmtTime(s.end)),
          s.room ? h('span', { class: 'edr-course-room' }, s.room) : null))));
    }));
  }

  EDR.overview = { mount };
})();
