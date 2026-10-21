import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../src/parsers.js');
const { parseAudit, parseResults, parseMyClasses, parseFinAid, parseSessions, parseSlots, mergeSchedule, to24, titleCase, aidName } = globalThis.EDR.parsers;

// Fixtures mirror EduRec's text layout (one text node per line); all values are invented.

const AUDIT = `
My Graduation Audit Report
NUS | Undergraduate
Graduation check outcome:
Not Satisfied
Common Curriculum Requirements
UE Requirements
Not Satisfied:   Pass 40 Units of Unrestricted Elective Courses.
Units: 40.00 required, 28.00 taken, 12.00 needed
Pass 40 UTs of UEs.
Not Satisfied:   >
Units: 40.00 required, 28.00 taken, 12.00 needed
Overall Requirements
Not Satisfied:   >
Overall UT Requirement
Not Satisfied:   Verify overall minimum 160 Units for the degree.
Units: 160.00 required, 148.00 taken, 12.00 needed
Residency Requirement
`;

test('parseAudit finds outcome, overall totals and requirement rows', () => {
  const a = parseAudit(AUDIT);
  assert.equal(a.outcome, 'Not Satisfied');
  assert.deepEqual(a.overall, { required: 160, taken: 148, needed: 12 });
  assert.equal(a.requirements.length, 1);
  assert.deepEqual(a.requirements[0], {
    label: 'Pass 40 Units of Unrestricted Elective Courses.', status: 'Not Satisfied', required: 40, taken: 28, needed: 12
  });
});

test('parseAudit ignores pages that are not the audit', () => {
  assert.equal(parseAudit('Some other page\nUnits: 4.00 required, 0.00 taken, 4.00 needed'), null);
});

const RESULTS = `
2024/2025 Semester 1
National University of Singapore
Undergraduate
Change
Course Grades
Course
Description
Units Taken
Grade
CS1234
DATA STRUCTURES AND ALGORITHMS
4.00
A-
GE1001
THINKING IN THE AGE OF MACHINES
4.00
B+
CFG1010
CAREER STARTER
2.00
CS
Program - Bachelor of Computing
From Enrollment
Earned graded units in GPA
8.00
40.00
GPA
4.21
Academic Standing Status
Passed/Proceed
Important Information for undergraduate students:
`;

test('parseResults reads term, grades, cumulative GPA and standing', () => {
  const r = parseResults(RESULTS);
  assert.equal(r.term, '2024/2025 Semester 1');
  assert.equal(r.cumulativeGpa, 4.21);
  assert.equal(r.termGpa, null);
  assert.equal(r.standing, 'Passed/Proceed');
  assert.deepEqual(r.courses.map((c) => [c.code, c.units, c.grade]), [
    ['CS1234', 4, 'A-'], ['GE1001', 4, 'B+'], ['CFG1010', 2, 'CS']
  ]);
  assert.equal(r.courses[0].title, 'Data Structures and Algorithms');
});

test('parseResults returns term and cumulative GPA when both appear', () => {
  const r = parseResults(RESULTS.replace('GPA\n4.21', 'GPA\n4.40\n4.21'));
  assert.equal(r.termGpa, 4.4);
  assert.equal(r.cumulativeGpa, 4.21);
});

test('parseResults copes with EduRec repeating column labels inside every cell', () => {
  // Real EduRec layout when hidden labels leak into the text (values invented).
  const leaky = `
2024/2025 Semester 2
Course Grades
5 rows
Course
Description
Units Taken
Grade
Course
CS1234
Description
DATA STRUCTURES AND ALGORITHMS
Units Taken
4.00
Grade
A-
Course
CFG1010
Description
CAREER STARTER
Units Taken
2.00
Grade
CS
Program - Bachelor of Computing
3 rows
From Enrollment
From Transfer Credit
Combined Term Total
Cumulative Total
Earned graded units in GPA
From Enrollment
16.00
Combined Term Total
16.00
Cumulative Total
80.00
GPA
From Enrollment
From Transfer Credit
Combined Term Total
Cumulative Total
4.37
1 row
Academic Standing Status
Passed/Proceed
1 row
`;
  const r = parseResults(leaky);
  assert.equal(r.cumulativeGpa, 4.37);
  assert.equal(r.standing, 'Passed/Proceed');
  assert.deepEqual(r.courses.map((c) => [c.code, c.units, c.grade]), [['CS1234', 4, 'A-'], ['CFG1010', 2, 'CS']]);
});

test('parseResults ignores pages without a grades table', () => {
  assert.equal(parseResults('Select A Term\n2024/2025 Semester 1'), null);
});

const CLASSES = `
View My Classes@CourseReg
Undergraduate
2026/2027 Semester 1
CS9001 Example Systems Course
Class
Class Type
Session
Units
Status
L - L1 - 10001
Lecture
Regular
4.00
Enrolled
T - T07 - 10002
Tutorial
Regular
Enrolled
XY2002 Another Course
Class
Class Type
L - L2 - 20001
Lecture
Regular
4.00
Enrolled
`;

test('parseMyClasses groups classes under courses', () => {
  const c = parseMyClasses(CLASSES);
  assert.equal(c.term, '2026/2027 Semester 1');
  assert.deepEqual(c.courses, [
    { code: 'CS9001', title: 'Example Systems Course', classes: [{ type: 'Lecture', group: 'L1' }, { type: 'Tutorial', group: 'T07' }] },
    { code: 'XY2002', title: 'Another Course', classes: [{ type: 'Lecture', group: 'L2' }] }
  ]);
});

const FINAID = `
View Financial Aid Disbursed
All Terms
Term From
2023/2024 Semester 1
Term To
2024/2025 Semester 1
GO
3 rows
FA Code
FA Type
Item Type
Term
Posted Date
Amount
1
Example Merit Award
Third Party Contracts
Example Merit Award
2023/2024 Semester 1
01/08/2023
1000.50
2
Example Merit Award
Third Party Contracts
Example Merit Award
2023/2024 Semester 2
05/01/2024
1,000.50
3
Example Merit Award
Third Party Contracts
Example Merit Award
2024/2025 Semester 1
02/08/2024
999.00
Currency used is Singapore Dollar.
`;

test('parseFinAid reads every disbursement and the total', () => {
  const f = parseFinAid(FINAID);
  assert.equal(f.rows.length, 3);
  assert.deepEqual(f.rows[2], { name: 'Example Merit Award', term: '2024/2025 Semester 1', posted: '02/08/2024', amount: 999 });
  assert.equal(f.total, 3000);
});

test('aidName strips the repeated type columns', () => {
  assert.equal(aidName('Example Merit Award Third Party Contracts Example Merit Award'), 'Example Merit Award');
  assert.equal(aidName('Plain Name'), 'Plain Name');
});

test('titleCase only rewrites all-caps titles', () => {
  assert.equal(titleCase('INTRODUCTION TO OPERATING SYSTEMS'), 'Introduction to Operating Systems');
  assert.equal(titleCase('Already Fine'), 'Already Fine');
});

// View Classes, "By Date" and "By Class" layouts (values invented).
const BY_DATE = `
2026/2027 Semester 1
By Class
By Date
From
To
Please note that there will be no classes on public holidays.
Monday August 10
6:00PM
ABC 2101  Lecture
Room: LT01
Status: Enrolled
Tuesday August 25
2:00PM
XY 3219  Tutorial
Room: COM9-01
Status: Enrolled
Monday January 11
9:00AM
ABC 2101  Lecture
Room: LT01
Status: Enrolled
`;

const BY_CLASS = `
2026/2027 Semester 1
By Class
By Date
XY 3219   Software Design and Architectu
Class
Start/End Dates
Days and Times
Room
25/08/2026 - 25/08/2026
Days: Tuesday
Times: 2:00PM to 3:00PM
Days: Tuesday
Times: 2:00PM to 3:00PM
COM9-01
ABC 2101   Example Course
Days: Monday
Times: 6:00PM to 8:00PM
`;

test('to24 converts 12-hour times', () => {
  assert.equal(to24('2:00PM'), '14:00');
  assert.equal(to24('12:30PM'), '12:30');
  assert.equal(to24('12:00AM'), '00:00');
  assert.equal(to24('9:05 AM'), '09:05');
  assert.equal(to24('nope'), null);
});

test('parseSessions reads dated meetings and places January in the next year', () => {
  const r = parseSessions(BY_DATE);
  assert.equal(r.term, '2026/2027 Semester 1');
  assert.deepEqual(r.sessions[0], { date: '2026-08-10', start: '18:00', code: 'ABC2101', type: 'Lecture', room: 'LT01', status: 'Enrolled' });
  assert.equal(r.sessions[1].code, 'XY3219');
  assert.equal(r.sessions[2].date, '2027-01-11');
});

test('parseSlots reads weekly end times without duplicates', () => {
  assert.deepEqual(parseSlots(BY_CLASS).slots, [
    { code: 'XY3219', day: 'Tuesday', start: '14:00', end: '15:00' },
    { code: 'ABC2101', day: 'Monday', start: '18:00', end: '20:00' }
  ]);
});

test('mergeSchedule attaches end times and falls back to one hour', () => {
  const merged = mergeSchedule(parseSessions(BY_DATE).sessions, parseSlots(BY_CLASS).slots);
  assert.equal(merged[0].day, 'Monday');
  assert.equal(merged[0].end, '20:00');
  assert.equal(merged[0].endKnown, true);
  const lone = mergeSchedule([{ date: '2026-08-12', start: '10:00', code: 'Q1000', type: 'Lab', room: '' }], []);
  assert.equal(lone[0].end, '11:00');
  assert.equal(lone[0].endKnown, false);
});

test('schedule parsers ignore unrelated pages', () => {
  assert.equal(parseSessions('Course Grades\nGPA 4.00'), null);
  assert.equal(parseSlots('Course Grades\nGPA 4.00'), null);
});
