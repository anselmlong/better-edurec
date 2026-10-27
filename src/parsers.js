(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // All parsers take plain page text (one text node per line, as produced by
  // EDR.nodeText) so they can be unit-tested without a browser.

  const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  const lines = (s) => String(s || '').split('\n').map(flat).filter(Boolean);
  const num = (s) => Number(String(s).replace(/,/g, ''));

  const TERM_RE = /(\d{4}\/\d{4} (?:Semester \d|Special Term ?\(Part \d\)))/;
  const CODE = '([A-Z]{2,4}\\d{4}[A-Z]{0,3})';
  const GRADE = '(A\\+|A-|A|B\\+|B-|B|C\\+|C|D\\+|D|F|CS|CU|S|U|IP|IC|W|EXE)';

  // Graduation audit report: "Units: 40.00 required, 24.00 taken, 16.00 needed"
  // lines, each labelled by the "Not Satisfied: <rule>" line above it.
  function parseAudit(text) {
    const ls = lines(text);
    if (!ls.some((l) => /graduation audit report/i.test(l))) return null;
    const outcomeM = /Graduation check outcome:?\s*(Not Satisfied|Satisfied)/i.exec(flat(text));
    const reqs = [];
    for (let i = 0; i < ls.length; i++) {
      const m = /^Units:\s*([\d.,]+)\s*required,\s*([\d.,]+)\s*taken,\s*([\d.,]+)\s*needed/i.exec(ls[i]);
      if (!m) continue;
      const required = num(m[1]);
      const taken = num(m[2]);
      const needed = num(m[3]);
      let label = '';
      let status = needed > 0 ? 'Not Satisfied' : 'Satisfied';
      for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
        const sm = /^(Not Satisfied|Satisfied):\s*(.*)$/i.exec(ls[j]);
        if (sm) {
          status = sm[1];
          label = sm[2].replace(/^>\s*/, '').trim() || ls[j - 1] || '';
          break;
        }
      }
      if (!label) label = ls[i - 1] || 'Requirement';
      const prev = reqs[reqs.length - 1];
      // The report repeats a requirement's totals under a shorter sub-rule; keep the first.
      if (prev && prev.required === required && prev.taken === taken && prev.needed === needed && i - prev.line <= 6) continue;
      reqs.push({ label, status, required, taken, needed, line: i });
    }
    const overall = reqs.find((r) => /overall/i.test(r.label)) ||
      reqs.reduce((a, r) => (!a || r.required > a.required ? r : a), null);
    return {
      outcome: outcomeM ? outcomeM[1] : null,
      overall: overall ? { required: overall.required, taken: overall.taken, needed: overall.needed } : null,
      requirements: reqs.filter((r) => r !== overall).map(({ line, ...r }) => r)
    };
  }

  // Exam results page: course grades table, then the GPA row and academic standing.
  // Column names EduRec repeats inside every results cell (normally hidden).
  const RESULT_LABELS = new Set(['Course', 'Description', 'Units Taken', 'Grade', 'From Enrollment',
    'From Transfer Credit', 'Combined Term Total', 'Cumulative Total']);

  function parseResults(text) {
    const ls = lines(text);
    const head = ls.indexOf('Course Grades');
    // Keep the table's own header row; drop label lines repeated inside cells.
    const cleaned = ls.filter((l, i) => !/^\d+ rows?$/.test(l) && !(RESULT_LABELS.has(l) && i > head + 4 && head >= 0));
    const all = flat(cleaned.join('\n'));
    const start = all.indexOf('Course Grades');
    if (start < 0 || !/\bGPA\b/.test(all)) return null;
    const endIdx = all.search(/Program - |Earned graded units/);
    const region = all.slice(start + 'Course Grades'.length, endIdx > start ? endIdx : undefined);
    const rowRe = new RegExp('\\b' + CODE + '\\s+(.+?)\\s+(\\d{1,2}\\.\\d{2})\\s+' + GRADE + '(?=\\s|$)', 'g');
    const courses = [];
    let m;
    while ((m = rowRe.exec(region))) {
      courses.push({ code: m[1], title: titleCase(m[2].replace(/^(Description|Units Taken|Grade)\s+/g, '')), units: num(m[3]), grade: m[4] });
    }
    // "Earned graded units in GPA 8.00 …" rows come first; the GPA row itself is the last match.
    const gpaRows = [...all.matchAll(/\bGPA((?:\s+\d\.\d{2}\b)+)/g)];
    const gpaM = gpaRows[gpaRows.length - 1];
    const gpas = gpaM ? gpaM[1].trim().split(/\s+/).map(Number) : [];
    const termM = TERM_RE.exec(all);
    const standingM = /Academic Standing Status\s+(.+?)(?=\s+Important|\s+More Details|$)/.exec(all);
    return {
      term: termM ? termM[1] : null,
      courses,
      cumulativeGpa: gpas.length ? gpas[gpas.length - 1] : null,
      termGpa: gpas.length > 1 ? gpas[0] : null,
      standing: standingM ? standingM[1].trim() : null
    };
  }

  // CourseReg "View My Classes": a course header line followed by its classes.
  function parseMyClasses(text) {
    const ls = lines(text);
    if (!ls.some((l) => /Class Type/.test(l))) return null;
    const courses = [];
    let cur = null;
    for (let i = 0; i < ls.length; i++) {
      const head = new RegExp('^' + CODE + '\\s+(.+)$').exec(ls[i]);
      if (head && ls[i + 1] === 'Class') {
        cur = { code: head[1], title: head[2], classes: [] };
        courses.push(cur);
        continue;
      }
      const cls = /^([A-Z]+) - ([A-Z0-9]+) - (\d+)$/.exec(ls[i]);
      if (cls && cur) cur.classes.push({ type: ls[i + 1] || cls[1], group: cls[2] });
    }
    const termM = TERM_RE.exec(flat(text));
    return { term: termM ? termM[1] : null, courses };
  }

  // "View Financial Aid Disbursed": index, name/type/item, term, posted date, amount.
  function parseFinAid(text) {
    const all = flat(text);
    const start = all.indexOf('Posted Date Amount');
    if (start < 0) return null;
    const region = all.slice(start + 'Posted Date Amount'.length);
    const re = /(?:^|\s)(\d+)\s+(.+?)\s+(\d{4}\/\d{4} (?:Semester \d|Special Term ?\(Part \d\)))\s+(\d{2}\/\d{2}\/\d{4})\s+(-?[\d,]+\.\d{2})/g;
    const rows = [];
    let m;
    while ((m = re.exec(region))) {
      rows.push({ name: aidName(m[2]), term: m[3], posted: m[4], amount: num(m[5]) });
    }
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return { rows, total: Math.round(total * 100) / 100 };
  }

  // "Foo Award Third Party Contracts Foo Award" -> "Foo Award" (code and item type repeat the name).
  function aidName(s) {
    for (let len = Math.floor(s.length / 2); len >= 3; len--) {
      const p = s.slice(0, len);
      if (s.endsWith(' ' + p) && (s[len] === ' ')) return p;
    }
    return s;
  }

  function titleCase(s) {
    if (s !== s.toUpperCase()) return s;
    const small = new Set(['and', 'of', 'the', 'in', 'for', 'to', 'a', 'an', 'on', 'with']);
    return s.toLowerCase().replace(/\b[a-z][a-z']*/g, (w, i) => (i > 0 && small.has(w) ? w : w[0].toUpperCase() + w.slice(1)));
  }

  // ---- Timetable (Academic Records › View Classes) ----

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // "2:00PM" -> "14:00"
  function to24(t) {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t).trim());
    if (!m) return null;
    let hr = Number(m[1]) % 12;
    if (/pm/i.test(m[3])) hr += 12;
    return String(hr).padStart(2, '0') + ':' + m[2];
  }

  // Calendar year of a month inside an academic year "2026/2027": Aug–Dec are the first year.
  function yearFor(ay, monthIndex) {
    const [first, second] = ay.split('/').map(Number);
    return monthIndex >= 6 ? first : second;
  }

  // "By Date" view: one entry per class meeting with date, start, course, type and room.
  function parseSessions(text) {
    const ls = lines(text);
    if (!ls.includes('By Date') || !ls.some((l) => /^Room:/.test(l))) return null;
    const termM = TERM_RE.exec(flat(text));
    const ay = termM ? termM[1].slice(0, 9) : null;
    const DAY = new RegExp('^(' + WEEKDAYS.join('|') + ') (' + MONTHS.join('|') + ') (\\d{1,2})$');
    const CLS = /^([A-Z]{2,4}) ?(\d{4}[A-Z]{0,3})\s+(.+)$/;
    const sessions = [];
    for (let i = 0; i < ls.length; i++) {
      const d = DAY.exec(ls[i]);
      if (!d) continue;
      const start = to24(ls[i + 1]);
      const c = CLS.exec(ls[i + 2] || '');
      if (!start || !c) continue;
      const room = /^Room:\s*(.*)$/.exec(ls[i + 3] || '');
      const status = /^Status:\s*(.*)$/.exec(ls[i + (room ? 4 : 3)] || '');
      const month = MONTHS.indexOf(d[2]);
      const year = ay ? yearFor(ay, month) : new Date().getFullYear();
      sessions.push({
        date: year + '-' + String(month + 1).padStart(2, '0') + '-' + d[3].padStart(2, '0'),
        start, code: c[1] + c[2], type: c[3].trim(),
        room: room ? room[1].trim() : '', status: status ? status[1].trim() : ''
      });
    }
    return { term: termM ? termM[1] : null, sessions };
  }

  // "By Class" view: weekly slots with end times ("Days: Tuesday", "Times: 2:00PM to 3:00PM").
  function parseSlots(text) {
    const ls = lines(text);
    if (!ls.some((l) => /^Times:\s/.test(l))) return null;
    const termM = TERM_RE.exec(flat(text));
    const HEAD = /^([A-Z]{2,4}) ?(\d{4}[A-Z]{0,3}) (.+)$/;
    const slots = [];
    const seen = new Set();
    let code = null;
    let day = null;
    for (const l of ls) {
      const head = HEAD.exec(l);
      if (head && !/^Days:|^Times:/.test(l)) { code = head[1] + head[2]; continue; }
      const dm = /^Days:\s*(\w+)/.exec(l);
      if (dm) { day = dm[1]; continue; }
      const tm = /^Times:\s*(\d{1,2}:\d{2}\s*[AP]M)\s+to\s+(\d{1,2}:\d{2}\s*[AP]M)/i.exec(l);
      if (tm && code && day) {
        const slot = { code, day, start: to24(tm[1]), end: to24(tm[2]) };
        const key = slot.code + slot.day + slot.start;
        if (!seen.has(key)) { seen.add(key); slots.push(slot); }
      }
    }
    return { term: termM ? termM[1] : null, slots };
  }

  // Attach end times from the weekly slots to dated sessions (1 hour if unknown).
  function mergeSchedule(sessions, slots) {
    const ends = new Map((slots || []).map((s) => [s.code + s.day + s.start, s.end]));
    return (sessions || []).map((s) => {
      const [y, m, d] = s.date.split('-').map(Number);
      const day = WEEKDAYS[new Date(y, m - 1, d).getDay()];
      const end = ends.get(s.code + day + s.start);
      const [hh, mm] = s.start.split(':').map(Number);
      return { ...s, day, end: end || String(Math.min(hh + 1, 23)).padStart(2, '0') + ':' + String(mm).padStart(2, '0'), endKnown: !!end };
    });
  }

  // View Exam Schedule, "By Class" layout. Each row starts at an "AB 1234-L2" line
  // and runs to the next one: "(1111)", the title cut to 30 characters with " (L)",
  // then mode, date (DD-MM-YYYY), time range, venue, seat and an optional e-exam
  // tool. Exams not yet scheduled read "TBA" and have no date.
  function parseExamSchedule(text) {
    const ls = lines(text);
    if (!ls.includes('Exam Seat Nbr') || !ls.includes('Exam Venue')) return null;
    const ROW = /^([A-Z]{2,4}) ?(\d{4}[A-Z]{0,3})-([A-Z0-9]+)$/;
    const stop = ls.findIndex((l) => /^\*E-Exam Tool Description$|^Note:/.test(l));
    const body = ls.slice(0, stop > 0 ? stop : undefined);
    const exams = [];
    for (let i = 0; i < body.length; i++) {
      const m = ROW.exec(body[i]);
      if (!m) continue;
      let j = i + 1;
      const vals = [];
      while (j < body.length && !ROW.test(body[j])) vals.push(body[j++]);
      i = j - 1;
      const rest = vals.filter((v) => !/^\(\d+\)$/.test(v));
      const rawTitle = (rest.shift() || '').replace(/\s*\([A-Z]\)$/, '');
      const exam = { code: m[1] + m[2], cls: m[3], title: rawTitle, cut: rawTitle.length >= 30,
        mode: null, date: null, start: null, end: null, venue: null, seat: null, tool: null };
      const d = rest.findIndex((v) => /^\d{2}-\d{2}-\d{4}$/.test(v));
      if (d >= 0) {
        const [dd, mm, yyyy] = rest[d].split('-');
        exam.date = yyyy + '-' + mm + '-' + dd;
        exam.mode = rest.slice(0, d).join(' ') || null;
        const t = /^(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)$/i.exec(rest[d + 1] || '');
        if (t) { exam.start = to24(t[1]); exam.end = to24(t[2]); }
        const field = (v) => (v && v !== 'TBA' && v !== '-' ? v : null);
        exam.venue = field(rest[d + 2]);
        exam.seat = field(rest[d + 3]);
        exam.tool = field(rest[d + 4]);
      }
      exams.push(exam);
    }
    if (!exams.length) return null;
    const tools = {};
    for (const l of ls.slice(stop > 0 ? stop : ls.length)) {
      const t = /^([A-Z][A-Z0-9_]+) - (.+)$/.exec(l);
      if (t) tools[t[1]] = t[2];
    }
    const updatedM = /generated on (.+)$/.exec(ls.find((l) => /^Information shown on this page is generated on/.test(l)) || '');
    const termM = TERM_RE.exec(ls.join('\n'));
    exams.sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || String(a.date + a.start).localeCompare(String(b.date + b.start)));
    return { term: termM ? termM[1] : null, exams, tools, updated: updatedM ? updatedM[1] : null };
  }

  // Where an exam stands relative to now: 'past', 'today', 'soon' (within 7 days),
  // 'later' or 'tba'. `now` is a Date, passed in so this stays testable.
  function examWhen(exam, now) {
    if (!exam.date) return 'tba';
    const [y, m, d] = exam.date.split('-').map(Number);
    const [eh, em] = (exam.end || '23:59').split(':').map(Number);
    if (new Date(y, m - 1, d, eh, em) < now) return 'past';
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((new Date(y, m - 1, d) - today) / 86400000);
    return days === 0 ? 'today' : days <= 7 ? 'soon' : 'later';
  }

  // "View Past S/U Declarations and Balance": one row per declared course, then
  // "Available S/U Balance: 4".
  function parseSuHistory(text) {
    const ls = lines(text);
    const head = ls.indexOf('Courses Declared S/U');
    // The balance is on the label's line or the next one.
    const bi = ls.findIndex((l) => /^Available S\/U Balance/.test(l));
    const balM = bi >= 0 ? /^Available S\/U Balance:\s*([\d.]+)/.exec(ls[bi]) || /^([\d.]+)$/.exec(ls[bi + 1] || '') : null;
    if (head < 0 && !balM) return null;
    const rows = [];
    for (let i = Math.max(head, 0); i < ls.length; i++) {
      const t = TERM_RE.exec(ls[i]);
      if (!t || t[1] !== ls[i]) continue;
      const [code, title, su, orig, units] = ls.slice(i + 1, i + 6);
      if (!new RegExp('^' + CODE + '$').test(code || '') || !/^\d+(\.\d+)?$/.test(units || '')) continue;
      rows.push({ term: t[1], code, title, grade: su, original: orig, units: num(units) });
      i += 5;
    }
    return { rows, balance: balM ? num(balM[1]) : null };
  }

  EDR.parsers = { parseAudit, parseResults, parseMyClasses, parseFinAid, parseSessions, parseSlots, mergeSchedule, to24, titleCase, aidName,
    parseExamSchedule, examWhen, parseSuHistory };
})();
