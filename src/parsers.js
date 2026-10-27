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

  // ---- Academic Records ----

  // "View Academic Programme": an "[As of Today]" grid and a "[Latest … changes as
  // of <date>]" grid with the same columns. A row starts at a career followed by
  // its career number; empty cells (no sub-plan) leave no line.
  function parseProgramme(text) {
    const ls = lines(text);
    const today = ls.indexOf('[As of Today]');
    if (today < 0) return null;
    const latestAt = ls.findIndex((l) => /^\[Latest Program\/Plan\/Sub-Plan changes/.test(l));
    const rows = (from, to) => {
      const out = [];
      const part = ls.slice(from, to < 0 ? undefined : to);
      const starts = part.map((l, i) => (/^\d+$/.test(part[i + 1] || '') && !/^\d+ rows?$/.test(l) ? i : -1)).filter((i) => i >= 0);
      starts.forEach((s, k) => {
        const end = k + 1 < starts.length ? starts[k + 1] : part.findIndex((l, i) => i > s && /^Below table only|^\[/.test(l));
        const [career, , program, type, plan, subplan] = part.slice(s, end > s ? end : undefined);
        if (program && plan) out.push({ career, program, type: type || '', plan, subplan: subplan || '' });
      });
      return out;
    };
    const asOf = latestAt >= 0 ? (/as of (.+?)\]$/.exec(ls[latestAt]) || [])[1] || null : null;
    return { current: rows(today + 1, latestAt), latest: latestAt >= 0 ? { asOf, rows: rows(latestAt + 1, -1) } : null };
  }

  // "View Courses" for one term: "2024/2025 Semester 2 | Undergraduate | NUS", then
  // Course Code, Description, Units, Grading Basis, Status per row (no grades).
  function parseCourses(text) {
    const ls = lines(text);
    const head = ls.indexOf('Grading Basis');
    if (head < 0 || !ls.includes('Course Code')) return null;
    const key = /^(.+?) \| (.+?) \| (.+)$/.exec(ls.find((l) => TERM_RE.test(l) && l.includes(' | ')) || '');
    const IS_CODE = new RegExp('^' + CODE + '$');
    const courses = [];
    for (let i = head + 1; i < ls.length; i++) {
      if (!IS_CODE.test(ls[i]) || !/^\d+\.\d+$/.test(ls[i + 2] || '')) continue;
      const [code, title, units, basis, status] = ls.slice(i, i + 5);
      courses.push({ code, title: titleCase(title), units: num(units), basis: basis || '', status: status || '' });
      i += 4;
    }
    return { term: key ? key[1] : null, career: key ? key[2] : null, courses };
  }

  // "View Transfer Credit Report": per model a block of labelled facts (source
  // institution, program…), then rows of Transfer Term, Incoming Course, Units
  // Taken, Grade Input, Status, Equivalent, Units, Grade and Notes, some empty.
  const TRCR_COLS = new Set(['Transfer Term', 'Incoming Course', 'Units Taken', 'Grade Input', 'Status', 'Equivalent Subject / Catlg Nbr', 'Units', 'Grade', 'Notes']);
  function parseTransferCredit(text) {
    const ls = lines(text);
    if (!ls.includes('Credit Source Type') && !ls.includes('Equivalent Subject / Catlg Nbr')) return null;
    const SPACED = /^[A-Z]{2,4} ?\d{4}[A-Z]{0,3}$/;
    const UNITS = /^\d+\.\d+$/;
    const after = (i, label) => { const j = ls.indexOf(label, i); return j >= 0 ? ls[j + 1] : null; };
    const models = [];
    let cur = null;
    for (let i = 0; i < ls.length; i++) {
      if (ls[i] === 'Model Nbr') {
        cur = { status: /^\d+$/.test(ls[i + 1] || '') && !TRCR_COLS.has(ls[i + 2]) && ls[i + 2] !== 'Institution' ? ls[i + 2] : null,
          source: after(i, 'Source Institution'), type: after(i, 'Credit Source Type'), program: after(i, 'Program'), courses: [] };
        models.push(cur);
        continue;
      }
      const t = TERM_RE.exec(ls[i]);
      if (!t || t[1] !== ls[i] || !cur) continue;
      const vals = [];
      let j = i + 1;
      while (j < ls.length && !TERM_RE.test(ls[j]) && !/^(Model Nbr|Test Credits)$/.test(ls[j])) {
        if (!TRCR_COLS.has(ls[j])) vals.push(ls[j]);
        j++;
      }
      i = j - 1;
      const nums = vals.map((v, k) => (UNITS.test(v) ? k : -1)).filter((k) => k > 0);
      if (nums.length < 2 || !SPACED.test(vals[nums[1] - 1] || '')) continue;
      const [a, b] = nums;
      const mid = vals.slice(a + 1, b - 1);
      cur.courses.push({
        term: t[1], incoming: vals[0], taken: num(vals[a]), gradeIn: mid.length > 1 ? mid[0] : '', status: mid[mid.length - 1] || '',
        equiv: vals[b - 1].replace(/^([A-Z]+) ?/, '$1'), units: num(vals[b]), grade: vals[b + 1] || '', notes: vals.slice(b + 2).join(' ')
      });
    }
    const filled = models.filter((m) => m.courses.length);
    return { models: filled, noTests: ls.includes('No test credits found.') };
  }

  // ---- Personal Info ----

  // A grid reads as its column labels, then one line per filled cell. Returns the
  // lines after the first run of `cols`, up to the first line in `stop`.
  function cellsAfter(ls, cols, stop) {
    const at = ls.findIndex((l, i) => cols.every((c, k) => ls[i + k] === c));
    if (at < 0) return null;
    const rest = ls.slice(at + cols.length);
    const end = rest.findIndex((l) => (stop || []).includes(l));
    return end < 0 ? rest : rest.slice(0, end);
  }
  const chunks = (xs, n) => { const out = []; for (let i = 0; i + n <= xs.length; i += n) out.push(xs.slice(i, i + n)); return out; };
  const DMY = /^\d{2}\/\d{2}\/\d{4}$/;

  // "Demographic Information": label lines each followed by their value, then the
  // national ID, citizenship and pre-admission medical grids. MyInfo repeats the
  // labels but has no residency status or medical grid.
  const DEMO = { 'Student ID': 'id', 'Official Name': 'name', 'Gender': 'gender', 'Date of Birth': 'dob', 'Marital Status': 'marital', 'Current Residency Status': 'residency' };
  function parseDemographic(text) {
    const ls = lines(text);
    if (!ls.includes('Current Residency Status') || !ls.includes('Pre-Admission Medical Examination')) return null;
    const out = {};
    for (const [label, key] of Object.entries(DEMO)) {
      const v = ls[ls.indexOf(label) + 1];
      out[key] = ls.includes(label) && v && !DEMO[v] && v !== 'Identification Type/Number' ? v : null;
    }
    out.ids = chunks(cellsAfter(ls, ['National ID Type', 'National ID'], ['Citizenship Information']) || [], 2).map(([type, number]) => ({ type, number }));
    out.citizenship = chunks(cellsAfter(ls, ['Country', 'Description', 'Birth Country'], ['Pre-Admission Medical Examination']) || [], 3)
      .map(([country, status, birth]) => ({ country, status, birth }));
    const med = cellsAfter(ls, ['Status', 'Expiry Date (If any)']) || [];
    out.medical = med[0] ? { status: med[0], expiry: DMY.test(med[1] || '') ? med[1] : null } : null;
    return out;
  }

  // "Names": Official Name, Name and Type per row.
  function parseNames(text) {
    const cells = cellsAfter(lines(text), ['Official Name', 'Name', 'Type']);
    if (!cells) return null;
    return { names: chunks(cells, 3).filter((r) => /^[A-Z][a-z]+$/.test(r[2])).map(([official, name, type]) => ({ official, name, type })) };
  }

  // "Contact Details": an Email grid, social media links, a Phone grid. Which
  // entry is preferred is an image, so it isn't read.
  function parseContact(text) {
    const ls = lines(text);
    const emails = cellsAfter(ls, ['Email', 'Type', 'Preferred'], ['Social Media Links', 'Phone']);
    const phones = cellsAfter(ls, ['Phone', 'Type', 'Preferred']);
    if (!emails && !phones) return null;
    return {
      emails: chunks(emails || [], 2).filter(([a]) => a.includes('@')).map(([address, type]) => ({ address, type })),
      phones: chunks(phones || [], 2).filter(([n]) => /\d/.test(n)).map(([number, type]) => ({ number, type })),
      social: ls.includes('No Social Media Accounts are defined.') ? [] : null
    };
  }

  // "Addresses" and "Payment Address": per kind of address, a title, then
  // Address and From columns. An address reads country, postal code, its lines
  // (Addresses repeats the city), then From ("Current" or a date).
  const FROM = /^(Current|Future|\d{2}\/\d{2}\/\d{4})$/;
  const isTitle = (ls, i) => /Address$/.test(ls[i]) && ((ls[i + 1] === 'Address' && ls[i + 2] === 'From') || ls[i + 1] === 'No address defined');
  function parseAddresses(text) {
    const ls = lines(text);
    const kinds = [];
    for (let i = 0; i < ls.length; i++) {
      if (!isTitle(ls, i)) continue;
      const kind = { title: ls[i], addresses: [] };
      kinds.push(kind);
      let cells = [];
      for (let j = i + 1; j < ls.length && !isTitle(ls, j); j++) {
        if (j <= i + 2 && ls[i + 1] === 'Address') continue;
        if (!FROM.test(ls[j])) { cells.push(ls[j]); continue; }
        const [country, ...rest] = cells;
        const postal = /\d/.test(rest[0] || '') && /^[A-Z0-9 -]{3,10}$/i.test(rest[0]) ? rest.shift() : null;
        if (rest.length > 1 && rest[rest.length - 1].toUpperCase() === String(country).toUpperCase()) rest.pop();
        kind.addresses.push({ country, postal, lines: rest, from: ls[j] });
        cells = [];
      }
    }
    return kinds.length ? { kinds } : null;
  }

  // "Emergency Contacts": Contact and Phone per row; Primary is an image.
  function parseEmergency(text) {
    const cells = cellsAfter(lines(text), ['Contact', 'Phone', 'Primary']);
    if (!cells) return null;
    return { contacts: chunks(cells, 2).filter(([, p]) => /\d/.test(p)).map(([name, phone]) => ({ name, phone })) };
  }

  // "View Milestones": a grid whose cells repeat their label ("Milestone", then
  // its value if any). A record with nothing filled in is an empty row.
  const MILESTONE_COLS = { 'Milestone': 'name', 'Milestone Level': 'level', 'Milestone Complete': 'complete', 'How Completed': 'how',
    'Date Attempted': 'date', 'Milestone Grade': 'grade', 'Details': 'details', 'Comments': 'comments' };
  function parseMilestones(text) {
    const ls = lines(text);
    const head = ls.indexOf('Milestone Complete');
    if (head < 0 || !ls.includes('How Completed')) return null;
    const body = ls.slice(ls.indexOf('Comments', head) + 1).filter((l) => l !== 'Dummy Field');
    const rows = [];
    let cur = null;
    for (let i = 0; i < body.length; i++) {
      const field = MILESTONE_COLS[body[i]];
      if (!field) continue;
      if (field === 'name') { cur = {}; rows.push(cur); }
      const next = body[i + 1];
      if (cur && next != null && !(next in MILESTONE_COLS)) { cur[field] = next; i++; }
    }
    return { rows: rows.filter((r) => Object.keys(r).length) };
  }

  // View Classes, "By Class" layout, for the page view (parseSlots stays the
  // timetable's source). Per course: an "AB 1234 Title cut at 30" line, then per
  // component all its dates ("25/08/2026 - 25/08/2026"), then all its
  // "Days:"/"Times:" pairs, then all its rooms. Unscheduled components read
  // "Schedule: To be Announced".
  function parseClassList(text) {
    const ls = lines(text);
    if (!ls.includes('Days and Times')) return null;
    const HEAD = /^([A-Z]{2,4}) ?(\d{4}[A-Z]{0,3}) (.+)$/;
    const RANGE = /^(\d{2})\/(\d{2})\/(\d{4}) - (\d{2})\/(\d{2})\/(\d{4})$/;
    const iso = (d, m, y) => y + '-' + m + '-' + d;
    const courses = [];
    let course = null;
    let comp = null;
    let phase = null;
    const close = () => {
      if (!comp || !course) return;
      const slots = new Map();
      comp.meet.forEach((m, k) => {
        const room = comp.rooms[k] || '';
        const key = [m.day, m.start, m.end, room].join('|');
        const s = slots.get(key) || { day: m.day, start: m.start, end: m.end, room, first: m.from, last: m.to, count: 0 };
        if (m.from < s.first) s.first = m.from;
        if (m.to > s.last) s.last = m.to;
        s.count++;
        slots.set(key, s);
      });
      course.slots.push(...slots.values());
      if (comp.tba) course.tba = true;
      comp = null;
    };
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i];
      const head = HEAD.exec(l);
      if (head && ls[i + 1] === 'Class') {
        close();
        course = { code: head[1] + head[2], title: head[3], cut: head[3].length >= 30, slots: [], tba: false };
        courses.push(course);
        continue;
      }
      if (!course) continue;
      const r = RANGE.exec(l);
      if (r) {
        if (phase !== 'dates') { close(); comp = { dates: [], meet: [], rooms: [], tba: false }; }
        phase = 'dates';
        comp.dates.push({ from: iso(r[1], r[2], r[3]), to: iso(r[4], r[5], r[6]) });
        continue;
      }
      if (!comp) continue;
      const d = /^Days:\s*(\w+)/.exec(l);
      const t = /^Times:\s*(\d{1,2}:\d{2}\s*[AP]M)\s+to\s+(\d{1,2}:\d{2}\s*[AP]M)/i.exec(ls[i + 1] || '');
      if (d && t) {
        const at = comp.dates[comp.meet.length] || comp.dates[comp.dates.length - 1];
        comp.meet.push({ day: d[1], start: to24(t[1]), end: to24(t[2]), from: at.from, to: at.to });
        phase = 'times';
        i++;
        continue;
      }
      if (/^Schedule: To be Announced$/i.test(l)) { comp.tba = true; phase = 'times'; continue; }
      if (phase === 'times' || phase === 'rooms') {
        if (/^(Class|Start\/End Dates|Days and Times|Room)$/.test(l)) continue;
        phase = 'rooms';
        if (!comp.tba) comp.rooms.push(l);
      }
    }
    close();
    return courses.length ? { courses } : null;
  }

  EDR.parsers = { parseAudit, parseResults, parseMyClasses, parseFinAid, parseSessions, parseSlots, mergeSchedule, to24, titleCase, aidName,
    parseExamSchedule, examWhen, parseSuHistory, parseProgramme, parseCourses, parseTransferCredit, parseMilestones, parseClassList,
    parseDemographic, parseNames, parseContact, parseAddresses, parseEmergency };
})();
