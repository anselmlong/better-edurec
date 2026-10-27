(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});
  const h = (...a) => EDR.h(...a);

  // Page views (docs/research/04-page-designs.md): data pages get an answer view
  // that replaces EduRec's grids, forms get a short intro, dead ends get an
  // empty state with a way out. enhancers.js decides where they go.

  const ICONS = {
    calendar: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
    closed: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM5.6 5.6l12.8 12.8',
    bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
    info: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM12 11v6M12 7.5v.5'
  };

  const pad = (n) => String(n).padStart(2, '0');
  const asDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmt = (iso, o) => asDate(iso).toLocaleDateString('en-SG', o);
  function clock(t) {
    if (!t) return '';
    const [hh, mm] = t.split(':').map(Number);
    return (hh % 12 || 12) + ':' + pad(mm) + (hh < 12 ? ' AM' : ' PM');
  }
  // "9:00–11:00 AM", or "11:00 AM–1:00 PM" across noon.
  function span(a, b) {
    if (!a || !b) return clock(a);
    const [x, y] = [clock(a), clock(b)];
    return (x.slice(-2) === y.slice(-2) ? x.slice(0, -3) : x) + '–' + y;
  }
  // "Closed Book (auth. materials)" → "Closed book (authorised materials)"
  const sentence = (s) => String(s || '').toLowerCase().replace(/\bauth\./, 'authorised').replace(/^./, (c) => c.toUpperCase());

  function head(title, lede, badge) {
    return h('header', { class: 'edr-view-head' },
      h('div', { class: 'edr-row' }, h('h2', { class: 'edr-view-title' }, title), badge ? h('span', { class: 'edr-badge' }, 'Summary') : null),
      lede ? h('p', { class: 'edr-view-lede' }, lede) : null);
  }

  function view(...kids) {
    return h('section', { class: 'edr-root edr-view' }, ...kids);
  }

  function foot(...notes) {
    const shown = notes.filter(Boolean);
    return shown.length ? h('footer', { class: 'edr-view-foot' }, shown.map((n) => h('p', null, n))) : null;
  }

  const code = (c) => h('span', { class: 'edr-mono edr-code' }, c);

  // ---- Examinations ----

  function examSchedule(s, now) {
    now = now || new Date();
    const when = (e) => EDR.parsers.examWhen(e, now);
    const dated = s.exams.filter((e) => e.date);
    const next = dated.find((e) => when(e) !== 'past');
    const tba = s.exams.length - dated.length;
    let lede;
    if (next) {
      lede = ['Next: ', h('strong', null, next.code), ' on ' + fmt(next.date, { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + clock(next.start),
        next.venue ? ' at ' + next.venue + (next.seat ? ', seat ' + next.seat : '') : '', '.'];
    } else if (dated.length) {
      lede = dated.length === 1 ? 'Your exam this term is done.' : 'All ' + dated.length + ' exams this term are done.';
    } else lede = 'No exam dates yet.';
    const tbaNote = tba ? (tba === 1 ? '1 exam is' : tba + ' exams are') + ' not scheduled yet.' : null;

    const rows = h('ol', { class: 'edr-rows' }, s.exams.map((e) => {
      const w = when(e);
      const tag = w === 'today' ? ['Today', 'is-warn'] : w === 'soon' ? [inDays(e.date, now), 'is-ok'] : w === 'past' ? ['Done', 'is-quiet'] : null;
      const tool = e.tool ? (s.tools[e.tool] || e.tool) : null;
      return h('li', { class: 'edr-exam', 'data-when': w },
        e.date
          ? h('time', { class: 'edr-datebox', datetime: e.date },
            h('span', null, fmt(e.date, { weekday: 'short' })), h('strong', null, fmt(e.date, { day: 'numeric' })), h('span', null, fmt(e.date, { month: 'short' })))
          : h('span', { class: 'edr-datebox is-tba' }, h('strong', null, 'TBA')),
        h('div', { class: 'edr-exam-main' },
          h('p', { class: 'edr-exam-course' }, code(e.code), ' ', h('span', null, e.title + (e.cut ? '…' : ''))),
          h('p', { class: 'edr-muted' }, [e.mode && e.mode !== 'TBA' ? sentence(e.mode) : 'Details to be announced', tool].filter(Boolean).join(' · '))),
        e.date ? h('dl', { class: 'edr-facts' },
          fact('Time', span(e.start, e.end)), fact('Venue', e.venue || 'TBA'), fact('Seat', e.seat || 'TBA')) : null,
        tag ? h('span', { class: 'edr-tag ' + tag[1] }, tag[0]) : null);
    }));
    return view(head('Exam schedule', lede), rows,
      foot(tbaNote, 'Seat numbers and venues appear nearer the exams.', s.updated ? 'Updated ' + s.updated + '.' : null));
  }

  function inDays(iso, now) {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const n = Math.round((asDate(iso) - today) / 86400000);
    return n === 1 ? 'Tomorrow' : 'In ' + n + ' days';
  }

  function fact(label, value) {
    return h('div', null, h('dt', null, label), h('dd', null, value));
  }

  const GOOD = /^A[+-]?$|^S$|^CS$/;
  const BAD = /^F$|^U$|^CU$/;
  function grade(g) {
    return h('span', { class: 'edr-grade' + (GOOD.test(g) ? ' is-good' : BAD.test(g) ? ' is-bad' : '') }, g);
  }

  function results(r) {
    const graded = r.courses.filter((c) => /^[A-DF][+-]?$/.test(c.grade));
    const units = r.courses.reduce((s, c) => s + c.units, 0);
    const lede = [r.cumulativeGpa != null ? ['Cumulative GPA ', h('strong', null, r.cumulativeGpa.toFixed(2))] : null,
      r.termGpa != null ? [' · semester GPA ', h('strong', null, r.termGpa.toFixed(2))] : null,
      r.standing ? [r.cumulativeGpa != null ? '. ' : '', 'Standing: ' + r.standing + '.'] : null];
    return view(head(r.term ? 'Results · ' + r.term : 'Results', lede, true),
      h('ol', { class: 'edr-rows' }, r.courses.map((c) =>
        h('li', { class: 'edr-course' },
          h('p', { class: 'edr-exam-course' }, code(c.code), ' ', h('span', null, c.title)),
          h('span', { class: 'edr-muted edr-num' }, c.units + (c.units === 1 ? ' unit' : ' units')),
          grade(c.grade)))),
      foot(units + ' units this semester, ' + graded.length + ' of ' + r.courses.length + ' courses graded.'));
  }

  function suHistory(d) {
    const used = d.rows.reduce((s, r) => s + r.units, 0);
    const lede = d.balance != null
      ? [h('strong', { class: 'edr-lede-num' }, String(d.balance)), d.balance === 1 ? ' S/U unit left' : ' S/U units left', used ? ' · ' + used + ' used' : '']
      : used + ' S/U units used';
    return view(head('S/U history', lede),
      d.rows.length ? h('ol', { class: 'edr-rows' }, d.rows.map((r) =>
        h('li', { class: 'edr-course' },
          h('div', { class: 'edr-exam-main' },
            h('p', { class: 'edr-exam-course' }, code(r.code), ' ', h('span', null, r.title)),
            h('p', { class: 'edr-muted' }, r.term + ' · ' + r.units + ' units')),
          h('span', { class: 'edr-swap', 'aria-label': 'Original grade ' + r.original + ', now ' + r.grade },
            h('s', null, r.original), EDR.icon('M5 12h14M13 6l6 6-6 6', 14), grade(r.grade))))) : h('p', { class: 'edr-muted' }, 'You haven’t declared S/U on any course yet.'),
      foot('Declarations made this semester show here three working days after the S/U exercise closes.'));
  }

  // ---- Dead ends and form intros ----

  // spec: { icon, title, body, actions: [{ label, run, primary }] }; message is
  // EduRec's own text, kept one click away so nothing is paraphrased away.
  function deadEnd(spec, message) {
    return h('section', { class: 'edr-root edr-dead', role: 'status' },
      h('span', { class: 'edr-dead-icon' }, EDR.icon(ICONS[spec.icon] || ICONS.info, 22)),
      h('h2', { class: 'edr-view-title' }, spec.title),
      spec.body ? h('p', { class: 'edr-dead-body' }, spec.body) : null,
      spec.actions && spec.actions.length ? h('div', { class: 'edr-dead-actions' }, spec.actions.map((a, i) =>
        h('button', { type: 'button', class: 'edr-btn is-small' + (i ? ' is-ghost' : ''), onclick: a.run }, a.label))) : null,
      message ? h('details', { class: 'edr-dead-orig' }, h('summary', null, 'EduRec’s message'), h('p', null, message)) : null);
  }

  function intro(spec) {
    return h('section', { class: 'edr-root edr-task' },
      h('p', { class: 'edr-task-lede' }, spec.lede),
      spec.points && spec.points.length ? h('ul', { class: 'edr-task-points' }, spec.points.map((p) => h('li', null, p))) : null);
  }

  EDR.views = { examSchedule, results, suHistory, deadEnd, intro };
})();
