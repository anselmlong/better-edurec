import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../src/timetable.js');
const T = globalThis.EDR.timetable;

const S = (date, start, end, code = 'AB1000', type = 'Lecture') => ({ date, start, end, code, type, room: 'R1' });

test('weekToShow uses this week when it has classes, else the next class week', () => {
  const now = new Date(2026, 9, 21, 12, 0); // Wed 21 Oct 2026
  assert.equal(T.weekToShow([S('2026-10-22', '10:00', '11:00')], now).label, 'This week');
  const later = T.weekToShow([S('2026-11-03', '10:00', '11:00')], now);
  assert.equal(T.isoOf(later.monday), '2026-11-02');
  assert.equal(T.weekToShow([S('2026-09-01', '10:00', '11:00')], now), null);
});

test('nowAndNext finds the running class and the one after it', () => {
  const now = new Date(2026, 9, 21, 14, 30);
  const sessions = [S('2026-10-21', '14:00', '15:00', 'NOW1'), S('2026-10-21', '16:00', '17:00', 'NEXT1'), S('2026-10-20', '09:00', '10:00', 'PAST')];
  const r = T.nowAndNext(sessions, now);
  assert.equal(r.current.code, 'NOW1');
  assert.equal(r.next.code, 'NEXT1');
  assert.equal(T.until(r.next, now), 'in 1 h 30 min');
});

test('until says tomorrow and minutes', () => {
  const now = new Date(2026, 9, 21, 9, 50);
  assert.equal(T.until(S('2026-10-21', '10:00', '11:00'), now), 'in 10 min');
  assert.equal(T.until(S('2026-10-22', '10:00', '11:00'), now), 'tomorrow');
});

test('nusmodsTerm maps EduRec terms to NUSMods paths', () => {
  assert.deepEqual(T.nusmodsTerm('2026/2027 Semester 1'), { ay: '2026-2027', sem: 1, path: 'sem-1' });
  assert.deepEqual(T.nusmodsTerm('2024/2025 Special Term(Part 2)'), { ay: '2024-2025', sem: 4, path: 'st-ii' });
  assert.equal(T.nusmodsTerm('nonsense'), null);
});

test('classNoFor matches NUSMods zero-padded class numbers', () => {
  assert.equal(T.classNoFor('T3', 'Tutorial', { Tutorial: ['01', '02', '03'] }), '03');
  assert.equal(T.classNoFor('L1', 'Lecture', { Lecture: ['1'] }), '1');
  assert.equal(T.classNoFor('T13', 'Tutorial', undefined), '13');
});

test('nusmodsLink builds a v1 share URL', () => {
  const courses = [
    { code: 'AB1000', classes: [{ type: 'Lecture', group: 'L1' }, { type: 'Tutorial', group: 'T3' }] },
    { code: 'CD2000', classes: [{ type: 'Lecture', group: 'L2' }, { type: 'Unknown Type', group: 'X1' }] }
  ];
  const url = T.nusmodsLink(courses, '2026/2027 Semester 1', { AB1000: { Lecture: ['1'], Tutorial: ['01', '02', '03'] } });
  assert.equal(url, 'https://nusmods.com/timetable/sem-1/share?AB1000=LEC:1,TUT:03&CD2000=LEC:2');
});
