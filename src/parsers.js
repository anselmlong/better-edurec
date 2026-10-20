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

  EDR.parsers = { parseAudit, parseResults, parseMyClasses, parseFinAid, titleCase, aidName };
})();
