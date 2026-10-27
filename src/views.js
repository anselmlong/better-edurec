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

  // ---- Academic Records ----

  const tag = (text, kind) => h('span', { class: 'edr-tag ' + (kind || 'is-quiet') }, text);
  const unitsText = (n) => +n.toFixed(2) + (n === 1 ? ' unit' : ' units');
  // "Example Systems-TRK" → "Example Systems track"
  const subplan = (s) => String(s || '').replace(/-TRK$/, ' track');
  // "August 04, 2025" → "4 August 2025"
  const longDate = (s) => { const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('en-SG', { day: 'numeric', month: 'long', year: 'numeric' }); };

  function planRows(rows) {
    return h('ol', { class: 'edr-rows' }, rows.map((r) =>
      h('li', { class: 'edr-course' },
        h('div', { class: 'edr-exam-main' },
          h('p', { class: 'edr-exam-course' }, h('strong', null, r.plan)),
          h('p', { class: 'edr-muted' }, [r.program, subplan(r.subplan)].filter(Boolean).join(' · '))),
        r.type ? tag(r.type) : null)));
  }

  function programme(p) {
    const main = p.current.find((r) => /honou?rs|major/i.test(r.type)) || p.current[0];
    const lede = [h('strong', null, main.program), ', ' + [main.plan, subplan(main.subplan)].filter(Boolean).join(', ') + '.'];
    const same = p.latest && JSON.stringify(p.latest.rows) === JSON.stringify(p.current);
    const latest = p.latest && p.latest.rows.length && !same
      ? [h('h3', { class: 'edr-view-sub' }, 'Latest changes' + (p.latest.asOf ? ', as of ' + longDate(p.latest.asOf) : '')), planRows(p.latest.rows)]
      : null;
    return view(head('Academic programme', lede), planRows(p.current), latest,
      foot(main.career ? main.career + ' career.' : null,
        same && p.latest.asOf ? 'Last programme change on record: ' + longDate(p.latest.asOf) + '.' : null));
  }

  const WITHDRAWN = /withdrawn|drop/i;
  function courses(c) {
    const active = c.courses.filter((x) => !WITHDRAWN.test(x.status));
    const units = active.reduce((s, x) => s + x.units, 0);
    const su = active.filter((x) => /^Satisfactory\/Unsatisfactory$/i.test(x.basis)).length;
    const gone = c.courses.length - active.length;
    const lede = [h('strong', null, String(active.length)), active.length === 1 ? ' course, ' : ' courses, ', h('strong', null, unitsText(units)),
      gone ? ' · ' + gone + ' withdrawn' : '', su ? ' · ' + su + ' on S/U' : '', '.'];
    return view(head(c.term ? 'Courses · ' + c.term : 'Courses', lede),
      h('ol', { class: 'edr-rows' }, c.courses.map((x) => {
        const out = WITHDRAWN.test(x.status);
        const basis = /^Graded$/i.test(x.basis) ? null : /^Satisfactory\/Unsatisfactory$/i.test(x.basis) ? 'S/U' : x.basis;
        const status = out ? tag((/\(W\)/.test(x.status) ? 'Withdrawn (W)' : x.status), 'is-warn') : /^Enrolled$/i.test(x.status) ? null : tag(x.status);
        return h('li', { class: 'edr-course edr-enrol' + (out ? ' is-out' : '') },
          h('p', { class: 'edr-exam-course' }, code(x.code), ' ', h('span', null, x.title)),
          h('span', { class: 'edr-muted edr-num' }, unitsText(x.units)),
          h('span', { class: 'edr-tags' }, basis ? tag(basis) : null, status));
      })));
  }

  function transferCredit(t) {
    const all = t.models.flatMap((m) => m.courses);
    const units = all.reduce((s, x) => s + x.units, 0);
    const sources = [...new Set(t.models.map((m) => m.source).filter(Boolean))];
    const pending = all.filter((x) => x.status && !/^Posted$/i.test(x.status)).length;
    const lede = [h('strong', null, unitsText(units)), ' transferred', sources.length ? ' from ' + sources.join(' and ') : '',
      ' · ' + all.length + (all.length === 1 ? ' course' : ' courses') + (pending ? ', ' + pending + ' not posted yet' : ', all posted') + '.'];
    return view(head('Transfer credit', lede),
      h('ol', { class: 'edr-rows' }, all.map((x) =>
        h('li', { class: 'edr-course edr-credit' },
          h('div', { class: 'edr-exam-main' },
            h('p', { class: 'edr-exam-course' }, code(x.equiv), ' ', h('span', null, 'for ' + x.incoming)),
            h('p', { class: 'edr-muted' }, [x.term, unitsText(x.taken) + ' taken' + (x.gradeIn ? ', grade ' + x.gradeIn : ''), x.notes].filter(Boolean).join(' · '))),
          h('span', { class: 'edr-muted edr-num' }, unitsText(x.units)),
          h('span', { class: 'edr-tags' }, x.status && !/^Posted$/i.test(x.status) ? tag(x.status, 'is-warn') : null, x.grade ? grade(x.grade) : null)))),
      foot(t.noTests ? 'No test credits found.' : null));
  }

  function milestones(m, actions) {
    if (!m.rows.length) {
      return deadEnd({ icon: 'info', title: 'No milestones on your record', body: 'EduRec lists no milestones for this programme.', actions });
    }
    return view(head('Milestones', m.rows.length === 1 ? '1 milestone on your record.' : m.rows.length + ' milestones on your record.'),
      h('ol', { class: 'edr-rows' }, m.rows.map((r) =>
        h('li', { class: 'edr-course' },
          h('div', { class: 'edr-exam-main' },
            h('p', { class: 'edr-exam-course' }, h('strong', null, r.name || 'Milestone'), r.level ? h('span', null, ' · ' + r.level) : null),
            h('p', { class: 'edr-muted' }, [r.how, r.date, r.grade, r.details, r.comments].filter(Boolean).join(' · ') || 'No details yet')),
          r.complete ? tag(/^y/i.test(r.complete) ? 'Complete' : r.complete, /^y/i.test(r.complete) ? 'is-ok' : 'is-quiet') : null))));
  }

  // View Classes, By Date. `now` is passed in for tests.
  function classesByDate(d, now) {
    now = now || new Date();
    const stamp = (s) => { const [y, m, dd] = s.date.split('-').map(Number); const [hh, mm] = s.start.split(':').map(Number); return new Date(y, m - 1, dd, hh, mm); };
    const sorted = d.sessions.slice().sort((a, b) => stamp(a) - stamp(b));
    // A class that started under an hour ago still counts as current.
    const upcoming = sorted.filter((s) => stamp(s) > now - 3600000);
    const past = sorted.slice(0, sorted.length - upcoming.length);
    const next = upcoming[0];
    const lede = next
      ? ['Next: ', h('strong', null, next.code + ' ' + next.type), ' on ' + fmt(next.date, { weekday: 'long', day: 'numeric', month: 'long' }) + ', ' + clock(next.start),
        next.room ? ' in ' + next.room : '', '.']
      : 'No more classes this term.';
    const row = (s) => h('li', { class: 'edr-exam edr-meet', 'data-when': upcoming.includes(s) ? 'later' : 'past' },
      h('time', { class: 'edr-datebox', datetime: s.date },
        h('span', null, fmt(s.date, { weekday: 'short' })), h('strong', null, fmt(s.date, { day: 'numeric' })), h('span', null, fmt(s.date, { month: 'short' }))),
      h('div', { class: 'edr-exam-main' },
        h('p', { class: 'edr-exam-course' }, code(s.code), ' ', h('span', null, s.type)),
        s.status && !/^Enrolled$/i.test(s.status) ? h('p', { class: 'edr-muted' }, s.status) : null),
      h('dl', { class: 'edr-facts edr-facts-2' }, fact('Starts', clock(s.start)), fact('Room', s.room || 'TBA')));
    return view(head(d.term ? 'Classes · ' + d.term : 'Classes by date', lede, true),
      upcoming.length ? h('ol', { class: 'edr-rows' }, upcoming.map(row)) : null,
      past.length ? h('details', { class: 'edr-earlier' },
        h('summary', null, 'Earlier this term (' + past.length + ')'), h('ol', { class: 'edr-rows' }, past.map(row))) : null,
      foot('No classes on public holidays. Your instructors will tell you about any make-up classes.'));
  }

  const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  // View Classes, By Class: each course's weekly slots, with the weeks they run.
  function classesByClass(list) {
    const slots = list.courses.reduce((n, c) => n + c.slots.length, 0);
    const short = (iso) => fmt(iso, { day: 'numeric', month: 'short' });
    return view(head('Weekly classes', [h('strong', null, String(list.courses.length)), list.courses.length === 1 ? ' course, ' : ' courses, ',
      h('strong', null, String(slots)), slots === 1 ? ' class a week.' : ' classes a week.'], true),
      h('ol', { class: 'edr-rows' }, list.courses.map((c) =>
        h('li', { class: 'edr-weekly' },
          h('p', { class: 'edr-exam-course' }, code(c.code), ' ', h('span', null, c.title + (c.cut ? '…' : ''))),
          h('ul', { class: 'edr-slots' },
            c.slots.slice().sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start.localeCompare(b.start)).map((s) =>
              h('li', null,
                h('strong', null, s.day + ' ' + span(s.start, s.end)),
                h('span', null, s.room || 'Room TBA'),
                h('span', { class: 'edr-muted' }, (s.count === 1 ? short(s.first) : s.count + ' weeks, ' + short(s.first) + ' – ' + short(s.last))))),
            c.tba ? h('li', null, h('span', { class: 'edr-muted' }, 'One class’s schedule is to be announced.')) : null)))),
      foot('No classes on public holidays. Your instructors will tell you about any make-up classes.'));
  }

  // ---- Personal Info ----

  // "06/12/2003" (day first) → "6 December 2003"
  const dmy = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ''); return m ? fmt(m[3] + '-' + m[2] + '-' + m[1], { day: 'numeric', month: 'long', year: 'numeric' }) : s; };
  const btn = (label, run, cls) => h('button', { type: 'button', class: 'edr-btn is-small is-ghost' + (cls ? ' ' + cls : ''), onclick: run }, label);

  // An ID number shows its last four characters until asked.
  function masked(number) {
    const hidden = number.slice(0, 1) + '•'.repeat(Math.max(0, number.length - 5)) + number.slice(-4);
    const text = h('span', { class: 'edr-mono' }, hidden);
    const toggle = h('button', { type: 'button', class: 'edr-orig-toggle edr-reveal', 'aria-pressed': 'false' }, 'Show');
    toggle.addEventListener('click', () => {
      const on = toggle.getAttribute('aria-pressed') !== 'true';
      text.textContent = on ? number : hidden;
      toggle.textContent = on ? 'Hide' : 'Show';
      toggle.setAttribute('aria-pressed', String(on));
    });
    return h('span', { class: 'edr-row edr-secret' }, text, toggle);
  }

  // Demographic Information, with EduRec's photo when there is one. myInfo opens
  // the MyInfo page, where changes are made.
  function demographic(d, photo, myInfo) {
    const cit = d.citizenship[0];
    const rows = [
      ['Student ID', d.id && h('span', { class: 'edr-mono' }, d.id)],
      ['Date of birth', d.dob && dmy(d.dob)],
      ['Gender', d.gender],
      ['Marital status', d.marital],
      ...d.ids.map((x) => [x.type, x.number && masked(x.number)]),
      ['Citizenship', cit && [cit.country, cit.status].filter(Boolean).join(', ')],
      ['Birth country', cit && cit.birth],
      ['Pre-admission medical', d.medical && h('span', { class: 'edr-row' }, tag(d.medical.status, /^completed$/i.test(d.medical.status) ? 'is-ok' : 'is-warn'),
        d.medical.expiry ? h('span', { class: 'edr-muted' }, 'expires ' + dmy(d.medical.expiry)) : null)]
    ].filter(([, v]) => v);
    return view(head('Demographic information', [d.name ? h('strong', null, d.name) : null, d.name && d.residency ? ' · ' : '', d.residency || '', '.']),
      h('div', { class: 'edr-profile' },
        photo ? h('img', { class: 'edr-photo', src: photo, alt: 'Your student photo' }) : null,
        h('dl', { class: 'edr-profile-facts' }, rows.map(([l, v]) => fact(l, v)))),
      foot('Citizenship, residency or name changed? Update them through MyInfo with Singpass.', myInfo ? btn(myInfo.label, myInfo.run) : null));
  }

  // Records pages (names, contacts, addresses). Each section lists EduRec's rows;
  // `edit` and `add` hand the click to EduRec's own row or button.
  // section: { title, items: [{ main, sub, tag, edit }], empty, add: { label, run } }
  function records(title, lede, sections, ...notes) {
    return view(head(title, lede),
      sections.map((s) => [
        s.title || s.add ? h('div', { class: 'edr-rec-head' }, s.title ? h('h3', { class: 'edr-view-sub' }, s.title) : h('span'), s.add ? btn(s.add.label, s.add.run) : null) : null,
        s.items.length
          ? h('ol', { class: 'edr-rows' }, s.items.map((r) =>
            h('li', { class: 'edr-rec' },
              h('div', { class: 'edr-exam-main' },
                h('p', { class: 'edr-exam-course' }, r.main),
                r.sub ? h('p', { class: 'edr-muted' }, r.sub) : null),
              h('span', { class: 'edr-tags' }, r.tag ? tag(r.tag) : null, r.edit ? btn('Edit', r.edit, 'edr-rec-edit') : null))))
          : h('p', { class: 'edr-rec-empty edr-muted' }, s.empty || 'None on record.')]),
      foot(...notes));
  }

  function names(n, edit) {
    const shown = n.names.find((x) => x.type === 'Preferred') || n.names[0];
    return records('Names', shown ? ['EduRec shows your name as ', h('strong', null, shown.name), '.'] : 'No names on record.',
      [{ items: n.names.map((x, i) => ({ main: x.name, sub: x.official !== x.name ? 'Official name: ' + x.official : null, tag: x.type, edit: edit(i) })) }],
      'Your preferred name is the one Outlook, Canvas and other NUS systems show.');
  }

  function contact(c, edit, add) {
    const nus = c.emails.find((e) => e.type === 'NUS');
    return records('Contact details', nus ? ['University email goes to ', h('strong', null, nus.address.toLowerCase()), '.'] : null, [
      { title: 'Email', add: add('Add Email'), empty: 'No email on record.',
        items: c.emails.map((e, i) => ({ main: e.address.toLowerCase(), tag: e.type, edit: edit('Email', i) })) },
      { title: 'Phone', add: add('Add Phone'), empty: 'No phone number on record.',
        items: c.phones.map((p, i) => ({ main: p.number, tag: p.type, edit: edit('Phone', i) })) },
      c.social ? { title: 'Social media', add: add('Add Social Account'), empty: 'No social media accounts.', items: [] } : null
    ].filter(Boolean));
  }

  const oneLine = (a) => a.lines.join(', ');
  const place = (a) => [a.country, a.postal].filter(Boolean).join(' ');
  function addresses(d, edit, add) {
    const payment = d.kinds.length === 1 && d.kinds[0].title === 'Payment Address';
    const all = d.kinds.flatMap((k) => k.addresses);
    const same = all.length > 1 && all.every((a) => oneLine(a) + place(a) === oneLine(all[0]) + place(all[0]));
    // "Your mailing and home addresses are the same."
    const kinds = d.kinds.filter((k) => k.addresses.length).map((k) => k.title.replace(/ Address$/, '').toLowerCase());
    const lede = payment
      ? (all[0] ? [h('strong', null, oneLine(all[0])), ', ' + place(all[0]) + '.'] : 'No payment address on record.')
      : same ? 'Your ' + kinds.slice(0, -1).join(', ') + ' and ' + kinds[kinds.length - 1] + ' addresses are the same.'
        : all.length === 1 ? '1 address on record.' : all.length + ' addresses on record.';
    return records(payment ? 'Payment address' : 'Addresses', lede, d.kinds.map((k) => ({
      title: payment ? null : k.title[0] + k.title.slice(1).toLowerCase(), add: add('Add ' + k.title), empty: 'No ' + k.title.toLowerCase() + '.',
      items: k.addresses.map((a, i) => ({ main: h('span', { class: 'edr-addr' }, a.lines.map((l) => h('span', null, l))), sub: place(a),
        tag: a.from === 'Current' ? null : 'From ' + dmy(a.from), edit: edit(payment ? null : k.title, i) }))
    })));
  }

  function emergency(e, edit, add) {
    return records('Emergency contacts', e.contacts.length === 1 ? '1 emergency contact on record.' : e.contacts.length + ' emergency contacts on record.',
      [{ add: add('Add Contact'), empty: 'No emergency contacts.', items: e.contacts.map((c, i) => ({ main: c.name, sub: c.phone, edit: edit('Emergency Contacts', i) })) }]);
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

  EDR.views = { examSchedule, results, suHistory, programme, courses, transferCredit, milestones, classesByDate, classesByClass,
    demographic, names, contact, addresses, emergency, deadEnd, intro };
})();
