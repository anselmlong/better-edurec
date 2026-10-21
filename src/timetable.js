(function () {
  'use strict';
  const EDR = (globalThis.EDR = globalThis.EDR || {});

  // Pure helpers are separate from rendering so they can be unit-tested.

  const minutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const dateOf = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
  const isoOf = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

  function mondayOf(d) {
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return m;
  }

  // The week to show: this week if it has classes, else the week of the next class.
  function weekToShow(sessions, now) {
    const mon = mondayOf(now);
    const end = new Date(mon); end.setDate(end.getDate() + 7);
    const inWeek = (s, a, b) => { const d = dateOf(s.date); return d >= a && d < b; };
    if (sessions.some((s) => inWeek(s, mon, end))) return { monday: mon, label: 'This week' };
    const next = sessions.map((s) => dateOf(s.date)).filter((d) => d >= mon).sort((a, b) => a - b)[0];
    if (!next) return null;
    return { monday: mondayOf(next), label: 'Week of ' + mondayOf(next).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' }) };
  }

  function sessionsInWeek(sessions, monday) {
    const end = new Date(monday); end.setDate(end.getDate() + 7);
    return sessions.filter((s) => { const d = dateOf(s.date); return d >= monday && d < end; });
  }

  // Current class (if one is running) and the next one after now.
  function nowAndNext(sessions, now) {
    const today = isoOf(now);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const sorted = sessions.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
    const current = sorted.find((s) => s.date === today && minutes(s.start) <= nowMin && nowMin < minutes(s.end)) || null;
    const next = sorted.find((s) => s.date > today || (s.date === today && minutes(s.start) > nowMin)) || null;
    return { current, next };
  }

  function until(s, now) {
    const start = dateOf(s.date); const [h, m] = s.start.split(':').map(Number); start.setHours(h, m, 0, 0);
    const mins = Math.round((start - now) / 60000);
    if (mins < 60) return 'in ' + Math.max(mins, 1) + ' min';
    const sameDay = isoOf(start) === isoOf(now);
    if (sameDay) return 'in ' + Math.floor(mins / 60) + ' h ' + (mins % 60) + ' min';
    const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
    if (isoOf(start) === isoOf(tomorrow)) return 'tomorrow';
    return start.toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  // ---- NUSMods export ----

  const LESSON_ABBREV = {
    'Design Lecture': 'DLEC', Laboratory: 'LAB', Lecture: 'LEC', 'Packaged Laboratory': 'PLAB', 'Packaged Lecture': 'PLEC',
    'Packaged Tutorial': 'PTUT', Recitation: 'REC', 'Sectional Teaching': 'SEC', 'Seminar-Style Module Class': 'SEM',
    Tutorial: 'TUT', 'Tutorial Type 2': 'TUT2', 'Tutorial Type 3': 'TUT3', Workshop: 'WS'
  };

  // "2026/2027 Semester 1" -> { ay: '2026-2027', sem: 1, path: 'sem-1' }
  function nusmodsTerm(term) {
    const m = /^(\d{4})\/(\d{4}) (Semester (\d)|Special Term ?\(Part (\d)\))/.exec(term || '');
    if (!m) return null;
    const sem = m[4] ? Number(m[4]) : Number(m[5]) + 2;
    return { ay: m[1] + '-' + m[2], sem, path: ['', 'sem-1', 'sem-2', 'st-i', 'st-ii'][sem] };
  }

  // EduRec group "T13" -> NUSMods classNo. Uses NUSMods' own class list when known
  // (it zero-pads some, e.g. "01"); otherwise drops the letter prefix.
  function classNoFor(group, lessonType, known) {
    const bare = group.replace(/^[A-Z]+(?=\d)/, '');
    const list = (known && known[lessonType]) || [];
    return list.find((c) => c === group) || list.find((c) => c === bare) ||
      list.find((c) => /^\d+$/.test(c) && /^\d+$/.test(bare) && Number(c) === Number(bare)) || bare;
  }

  // Build the NUSMods share link (v1 format: CODE=LEC:1,TUT:13&CODE2=...).
  function nusmodsLink(courses, term, classLists) {
    const t = nusmodsTerm(term);
    if (!t || !courses.length) return null;
    const params = courses.map((c) => {
      const parts = c.classes
        .filter((k) => LESSON_ABBREV[k.type])
        .map((k) => LESSON_ABBREV[k.type] + ':' + classNoFor(k.group, k.type, classLists && classLists[c.code]));
      return c.code + '=' + parts.join(',');
    });
    return 'https://nusmods.com/timetable/' + t.path + '/share?' + params.join('&');
  }

  // Fetches NUSMods' class numbers for each course (public API, course codes only).
  async function fetchClassLists(courses, term) {
    const t = nusmodsTerm(term);
    const out = {};
    if (!t) return out;
    await Promise.all(courses.map(async (c) => {
      try {
        const res = await fetch('https://api.nusmods.com/v2/' + t.ay + '/modules/' + encodeURIComponent(c.code) + '.json');
        if (!res.ok) return;
        const data = await res.json();
        const sem = (data.semesterData || []).find((s) => s.semester === t.sem);
        if (!sem) return;
        const lists = {};
        for (const l of sem.timetable || []) (lists[l.lessonType] = lists[l.lessonType] || new Set()).add(l.classNo);
        out[c.code] = Object.fromEntries(Object.entries(lists).map(([k, v]) => [k, [...v]]));
      } catch (e) { /* offline or blocked: fall back to EduRec's numbers */ }
    }));
    return out;
  }

  async function openInNusmods(classesSnap) {
    const c = classesSnap && classesSnap.value;
    if (!c || !c.courses.length) return false;
    const win = window.open('about:blank', '_blank');
    const lists = await fetchClassLists(c.courses, c.term);
    const url = nusmodsLink(c.courses, c.term, lists);
    if (win && url) win.location.href = url;
    else if (url) location.href = url;
    return !!url;
  }

  EDR.timetable = { minutes, dateOf, isoOf, mondayOf, weekToShow, sessionsInWeek, nowAndNext, until, nusmodsTerm, classNoFor, nusmodsLink, fetchClassLists, openInNusmods };
})();
