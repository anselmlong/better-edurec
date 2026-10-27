(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // Each enhancer recognises a page by its text and adds a view of it: a summary
  // card, an answer view that replaces EduRec's grids (`hide` lists text inside
  // the blocks it replaces), a form intro or a dead-end panel. Enhancers with a
  // snapshot save it for the Overview. PeopleSoft swaps content in place, so
  // this re-runs whenever the page changes.
  // By Class nests a scroll area per course inside the page's own.
  const OUTER_SCROLL = '.ps_box-scrollarea:not(.ps_box-scrollarea .ps_box-scrollarea)';

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
      useful: (d) => d && d.courses.length,
      hide: ['Course Grades', 'Earned graded units in GPA', 'Academic Standing Status'],
      render: (d) => EDR.views.results(d)
    },
    {
      key: 'examschedule', anchor: 'Exam Seat Nbr', snapshot: false,
      test: (t) => t.includes('Exam Seat Nbr'),
      parse: (t) => EDR.parsers.parseExamSchedule(t),
      useful: (d) => d && d.exams.length,
      hide: ['Exam Seat Nbr', '*E-Exam Tool Description', /^Note: The Exam Seat Number/],
      render: (d) => EDR.views.examSchedule(d)
    },
    {
      key: 'suhistory', anchor: 'Courses Declared S/U', snapshot: false,
      test: (t) => t.includes('Courses Declared S/U'),
      parse: (t) => EDR.parsers.parseSuHistory(t),
      useful: (d) => d && (d.rows.length || d.balance != null),
      hide: ['Courses Declared S/U', /^Available S\/U Balance/, /^The table below shows the course/, 'Instructions:'],
      render: (d) => EDR.views.suHistory(d)
    },
    {
      key: 'programme', anchor: '[As of Today]', snapshot: false,
      test: (t) => t.includes('[As of Today]'),
      parse: (t) => EDR.parsers.parseProgramme(t),
      useful: (d) => d && d.current.length,
      hide: ['[As of Today]', /^\[Latest Program\/Plan\/Sub-Plan changes/, /^Below table only reflect data/],
      render: (d) => EDR.views.programme(d)
    },
    {
      key: 'courses', anchor: 'Grading Basis', snapshot: false,
      test: (t) => t.includes('Grading Basis') && t.includes('Course Code'),
      parse: (t) => EDR.parsers.parseCourses(t),
      useful: (d) => d && d.courses.length,
      hide: ['Grading Basis', /^\d{4}\/\d{4} .+ \| .+ \| .+$/],
      render: (d) => EDR.views.courses(d)
    },
    {
      key: 'transfer', anchor: 'Credit Source Type', snapshot: false,
      test: (t) => t.includes('Credit Source Type'),
      parse: (t) => EDR.parsers.parseTransferCredit(t),
      useful: (d) => d && d.models.length,
      hide: ['Course Credits', 'No test credits found.'],
      render: (d) => EDR.views.transferCredit(d)
    },
    {
      key: 'milestones', anchor: 'Milestone Complete', snapshot: false,
      test: (t) => t.includes('Milestone Complete'),
      parse: (t) => EDR.parsers.parseMilestones(t),
      useful: (d) => !!d,
      hide: ['Milestone Complete'],
      render: (d) => EDR.views.milestones(d, [openPage('View Academic Programme', 'View your programme')])
    },
    {
      key: 'classes', anchor: 'Class Type',
      test: (t) => t.includes('Class Type'),
      parse: (t) => EDR.parsers.parseMyClasses(t),
      useful: (d) => d && d.courses.length,
      render: classesCard
    },
    {
      key: 'sessions', anchor: 'Please note that there will be no classes on public holidays.',
      test: (t) => t.includes('By Date') && /\nRoom:/.test(t),
      parse: (t) => EDR.parsers.parseSessions(t),
      useful: (d) => d && d.sessions.length,
      // The By Date list sits in one scroll area; the view goes where it was.
      hide: [new RegExp('^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) [A-Z][a-z]+ \\d{1,2}$'),
        'Please note that there will be no classes on public holidays.', /^The course instructor\(s\) will advise on make up classes/],
      block: OUTER_SCROLL,
      render: (d) => EDR.views.classesByDate(d)
    },
    {
      key: 'slots', anchor: 'Please note that there will be no classes on public holidays.',
      test: (t) => /\nTimes: /.test(t),
      parse: (t) => EDR.parsers.parseSlots(t),
      useful: (d) => d && d.slots.length,
      hide: ['Days and Times', 'Please note that there will be no classes on public holidays.', /^The course instructor\(s\) will advise on make up classes/],
      block: OUTER_SCROLL,
      // The view needs rooms and weeks too; the snapshot stays parseSlots' output.
      render: (d, t) => { const list = EDR.parsers.parseClassList(t); return list ? EDR.views.classesByClass(list) : slotsCard(d); }
    },
    {
      key: 'finaid', anchor: 'FA Code',
      test: (t) => t.includes('Posted Date') && t.includes('FA Code'),
      parse: (t) => EDR.parsers.parseFinAid(t),
      useful: (d) => d && d.rows.length,
      render: aidCard
    }
  ];

  // ---- Dead ends and form intros (docs/research/04-page-designs.md) ----

  // Read-only ways out: EduRec's own page list, its term picker, its Back.
  const selectedPage = () => { const li = document.querySelector('ul.psa_list-linkmenu li.psc_selected'); return li ? li.textContent.trim() : null; };
  const navLink = (label) => [...document.querySelectorAll('ul.psa_list-linkmenu a')].find((a) => a.textContent.trim() === label);
  const openPage = (label, text) => ({ label: text, run: () => { const a = navLink(label); if (a) a.click(); } });
  const changeTerm = { label: 'Choose another term', run: () => { const a = document.getElementById('DERIVED_ACRD_FL_SSR_CHANGE_TERM'); if (a) a.click(); } };

  // match: EduRec's message (exact text or a pattern for its first line); anchor:
  // a plain substring of it, for the cheap page gate.
  const DEAD_ENDS = [
    { id: 'noexams', match: 'An exam schedule is not available for this term.', icon: 'calendar',
      title: 'No exam schedule for this term', body: 'EduRec has no exams listed for this term. Pick another term to see its schedule.',
      actions: () => [changeTerm] },
    { id: 'sms', anchor: 'release of results via SMS Notification', match: /^In our continuing efforts to improve student services, the release of results via SMS/, icon: 'bell',
      title: 'SMS result alerts have ended', body: 'Results are released in the uNivUS app, and on View Exam Results here from 7am on results day.',
      actions: () => [openPage('View Exam Results', 'View exam results')] },
    { id: 'suclosed', anchor: 'S/U Declaration System is currently unavailable', match: /^The S\/U Declaration System is currently unavailable/, icon: 'closed',
      title: 'S/U declaration is closed', body: 'It opens during the S/U declaration period on the university timeline. Your past declarations and S/U balance are still available.',
      actions: () => [openPage('Submit S/U Declarations', 'Back to S/U options')] },
    { id: 'noenrol', match: 'You are not eligible to declare courses. Please contact your home Faculty/School if you need further clarification.', icon: 'closed',
      title: 'You can’t declare courses here', body: 'EduRec says you’re not eligible to declare courses. Your home faculty or school can explain why.',
      actions: () => [openPage('View Courses', 'View your courses')] },
    { id: 'eponly', match: 'This letter is only for international students.', icon: 'info',
      title: 'The EP eligibility letter is for international students', body: 'EduRec only issues this letter to international students.',
      actions: () => [openPage('View Student Status Letter', 'Student status letter')] }
  ];

  // Forms: one line on what the page does and the rules that matter before acting,
  // taken from EduRec's own instructions. `before` is text in the block the intro sits above.
  const INTROS = [
    { id: 'specialcons', when: ['Make Submission for Current Semester'], before: 'Instructions:',
      lede: 'Apply for special consideration for this semester’s exams, or look up a past application.',
      points: ['You can’t change an application after you submit it.', 'The outcome is released with your results.'] },
    { id: 'su', when: ['Declare S/U for Academic Year'], before: 'Before you declare',
      lede: 'Declare S/U on this academic year’s eligible courses, or check past declarations and how many S/U units you have left.',
      points: ['You can change your declarations as often as you like while the exercise is open.', 'No action is needed if you don’t want to S/U anything.'] },
    // Review Exam Results and Student Requests share their wording; the selected
    // page-list item tells them apart.
    { id: 'review', page: 'Review Exam Results Request', when: ['Submit New Request', 'Previous Requests'], before: 'View all Request(s) Submitted',
      lede: 'Ask for an exam result to be reviewed, or check requests you’ve already made.' },
    { id: 'requests', page: 'Student Requests', when: ['Submit New Request', 'Previous Requests'], before: 'View all Request(s) Submitted',
      lede: 'Submit a new request, or view the requests you’ve already submitted.' },
    { id: 'statusletter', page: 'View Student Status Letter', when: ['Select A Program'], before: 'National University of Singapore', block: '.ps_box-grid-list',
      lede: 'Select a programme to get your student status letter.' },
    { id: 'loa', page: 'Apply for Leave of Absence', when: ['Important Notes:'], before: 'Important Notes:',
      lede: 'Apply for a leave of absence: read the notes below, then choose Next.',
      points: ['Apply for semester leave by the last day of Recess Week. Short-term leave can still be applied for after that.',
        'You pay fees for the semester if you apply after Instructional Week 2.',
        'Applications are closed from Reading Week until exam results are released.'] },
    { id: 'transcript', when: ['View All Requested Reports', 'Report Type'], before: 'View Report',
      lede: 'Generate an unofficial transcript: choose a report type for your programme, then Submit.' },
    { id: 'suletter', when: ['View S/U Original Grade Letter'], before: 'View S/U Original Grade Letter',
      lede: 'Get a letter listing the original letter grades of the courses you declared S/U.' }
  ];

  for (const d of DEAD_ENDS) {
    ENHANCERS.push({
      key: 'dead-' + d.id, anchor: d.anchor || d.match, snapshot: false,
      test: (t) => t.split('\n').some((l) => matches(l.trim(), d.match)),
      parse: (t) => ({ message: t.split('\n').map((l) => l.trim()).find((l) => matches(l, d.match)) }),
      useful: (x) => x && x.message,
      hide: [d.match],
      render: (x) => EDR.views.deadEnd({ ...d, actions: d.actions() }, x.message)
    });
  }
  for (const f of INTROS) {
    ENHANCERS.push({
      key: 'intro-' + f.id, anchor: f.when[0], snapshot: false, place: f.before, block: f.block,
      test: (t) => f.when.every((w) => t.includes(w)) && (!f.page || selectedPage() === f.page),
      parse: () => ({ id: f.id }),
      useful: (x) => !!x,
      render: () => EDR.views.intro(f)
    });
  }

  const matches = (line, m) => (typeof m === 'string' ? line === m : m.test(line));

  const rendered = {};
  // "Show EduRec's version" state per view, kept across re-renders.
  const showOrig = {};
  const reported = {};

  // Tells the student the summary just reached their Overview.
  function markSaved(card) {
    const badge = card.querySelector('.edr-badge');
    if (!badge) return;
    badge.classList.add('is-saved');
    badge.replaceChildren(EDR.icon('M5 12.5l4.5 4.5L19 7.5', 14), 'Saved to Overview');
    setTimeout(() => {
      badge.classList.remove('is-saved');
      badge.replaceChildren('Summary');
    }, 3200);
  }

  function run() {
    if (!document.body || !EDR.store.alive()) return;
    if (EDR.shell && EDR.shell.ensureSideToggle) EDR.shell.ensureSideToggle();
    if (EDR.layout) EDR.layout.run();
    // Cheap gate: only walk rendered text when some enhancer's anchor is on the page.
    const raw = document.body.textContent;
    if (!ENHANCERS.some((e) => raw.includes(e.anchor)) && !ENHANCERS.some((e) => document.getElementById('edr-card-' + e.key))) return;
    // Read the page as if nothing were replaced: the hidden originals are the source.
    const root = document.documentElement;
    root.setAttribute('data-edr-peek', '');
    let text;
    try { text = EDR.nodeText(document.body); } finally { root.removeAttribute('data-edr-peek'); }
    for (const e of ENHANCERS) {
      try { runOne(e, text); } catch (err) { console.warn('[Better EduRec] summary failed', e.key, err); }
    }
  }

  function runOne(e, text) {
    const existing = document.getElementById('edr-card-' + e.key);
    const data = e.test(text) ? e.parse(text) : null;
    if (!e.useful(data)) {
      if (existing) existing.remove();
      unmark(e.key);
      rendered[e.key] = null;
      return;
    }
    const sig = JSON.stringify(data);
    const snapshot = e.snapshot !== false;
    if (snapshot && reported[e.key] !== sig) { reported[e.key] = sig; EDR.store.markSeen(e.key); }
    const blocks = e.hide ? mark(e) : [];
    if (existing && rendered[e.key] === sig) { addToggle(existing, e.key, blocks); return; }
    rendered[e.key] = sig;
    const el = e.render(data, text);
    el.id = 'edr-card-' + e.key;
    addToggle(el, e.key, blocks);
    if (existing) existing.replaceWith(el);
    else {
      el.classList.add('is-new');
      if (blocks.length) ((e.block && blocks.find((b) => b.matches(e.block))) || blocks[0]).before(el);
      else place(el, e.place || e.anchor, e.block);
    }
    if (snapshot) EDR.store.saveSnapshot(e.key, data).then((changed) => { if (changed) markSaved(el); }).catch(() => {});
  }

  // Marks the EduRec blocks a view replaces (CSS hides them; nothing moves).
  // A block that holds a control or the page list is never hidden.
  const CONTROLS = 'input, select, textarea, .ps-button, ul.psa_list-linkmenu, #DERIVED_ACRD_FL_SSR_CHANGE_TERM';
  function mark(e) {
    const blocks = new Set();
    for (const m of e.hide) {
      for (const node of findAll(m)) {
        const block = (e.block && node.closest(e.block)) || node.closest('.ps_box-grid-flex') || node.closest('#alertmsg, .ps_box-htmlarea, .ps_box-longedit, .ps_box-group');
        if (!block || block.closest('#PT_SIDE') || block.querySelector(CONTROLS)) continue;
        blocks.add(block);
      }
    }
    for (const b of blocks) {
      b.classList.add('edr-orig');
      b.setAttribute('data-edr-orig', e.key);
      b.classList.toggle('is-shown', !!showOrig[e.key]);
    }
    return [...blocks].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  }

  function unmark(key) {
    for (const b of document.querySelectorAll('[data-edr-orig="' + key + '"]')) {
      b.classList.remove('edr-orig', 'is-shown');
      b.removeAttribute('data-edr-orig');
    }
  }

  // A view that replaced something offers it back, once its blocks are marked.
  function addToggle(el, key, blocks) {
    // A dead end that has no EduRec message of its own offers the grid back instead.
    const own = el.classList.contains('edr-view') || (el.classList.contains('edr-dead') && !el.querySelector('.edr-dead-orig'));
    if (!blocks.length || !own || el.querySelector('.edr-orig-toggle')) return;
    (el.querySelector('.edr-view-foot') || el.appendChild(h('footer', { class: 'edr-view-foot' }))).append(origToggle(key));
  }

  function origToggle(key) {
    const label = () => (showOrig[key] ? 'Hide EduRec’s version' : 'Show EduRec’s version');
    const btn = h('button', { type: 'button', class: 'edr-orig-toggle', 'aria-expanded': String(!!showOrig[key]) }, label());
    btn.addEventListener('click', () => {
      showOrig[key] = !showOrig[key];
      for (const b of document.querySelectorAll('[data-edr-orig="' + key + '"]')) b.classList.toggle('is-shown', showOrig[key]);
      btn.textContent = label();
      btn.setAttribute('aria-expanded', String(showOrig[key]));
    });
    return btn;
  }

  // Inserts the card just before the block that holds the anchor text.
  function place(el, anchorText, outer) {
    const anchor = findAll(anchorText)[0];
    const block = anchor && ((outer && anchor.closest(outer)) || anchor.closest('.ps_box-group, .ps_box-grid, table') || anchor.parentElement);
    if (block && block.parentElement) block.parentElement.insertBefore(el, block);
    else (document.querySelector('form.PSForm') || document.body).append(el);
  }

  // Elements whose own text is `m` (a string, exactly) or matches `m` (a RegExp).
  function findAll(m) {
    const out = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      const v = n.nodeValue.trim();
      if (v && matches(v, m) && !n.parentElement.closest('.edr-root')) out.push(n.parentElement);
    }
    return out;
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

  function classesCard(c) {
    const count = c.courses.reduce((s, m) => s + m.classes.length, 0);
    return cardShell(c.term ? 'Your classes · ' + c.term : 'Your classes',
      h('p', { class: 'edr-muted' }, c.courses.length + ' courses · ' + count + ' classes'),
      h('ul', { class: 'edr-list' }, c.courses.map((m) =>
        h('li', null,
          h('span', null, h('span', { class: 'edr-mono' }, m.code), ' ', m.title),
          h('span', { class: 'edr-muted' }, m.classes.map((k) => k.type + ' ' + k.group).join(' · '))))));
  }

  function slotsCard(d) {
    return cardShell('Class times' + (d.term ? ' · ' + d.term : ''),
      h('ul', { class: 'edr-chips' }, d.slots.map((s) =>
        h('li', { class: 'edr-chip' }, h('span', { class: 'edr-mono' }, s.code), ' ', s.day.slice(0, 3) + ' ' + s.start + '–' + s.end))));
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
    // boot.js holds EduRec's content back until this first pass, so a replaced
    // grid never paints; both happen in this task, before the next paint.
    document.documentElement.removeAttribute('data-edr-pending');
    run();
    // One pass per frame, in requestAnimationFrame: it runs after every change
    // in that frame and before the frame paints, so content PeopleSoft swaps in
    // never shows before its view. The trailing pass covers background tabs,
    // where frames don't run.
    let frame = 0;
    const soon = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; run(); }); };
    const rerun = EDR.debounce(run, 150);
    const isOurs = (n) => n.nodeType === 1 && n.classList.contains('edr-root');
    new MutationObserver((records) => {
      const ours = (r) => {
        const el = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        if (el && el.closest('.edr-root')) return true;
        const moved = [...r.addedNodes, ...r.removedNodes];
        return r.type === 'childList' && moved.length > 0 && moved.every(isOurs);
      };
      if (records.every(ours)) return;
      soon();
      rerun();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  EDR.enhancers = { start, run };
})();
