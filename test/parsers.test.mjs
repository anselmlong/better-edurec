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

const { parseExamSchedule, examWhen, parseSuHistory } = globalThis.EDR.parsers;

const EXAMS = `
View Exam Schedule
2025/2026 Semester 2
By Class
By Date
Class
Description
Exam Mode
Exam Date
Schedule
Exam Venue
Exam Seat Nbr
*E-Exam Tool
AB 2105-L2
(1111)
Introduction to Example Studie (L)
Closed Book (auth. materials)
02-05-2026
9:00AM - 11:00AM
HALL-A
19
CD 1001-L04
(2222)
Example Workshop (L)
TBA
TBA
TBA
-
EF 4243-L1
(3333)
Example Vision Course (L)
Closed Book (auth. materials)
30-04-2026
5:00PM - 7:00PM
HALL-B
7
EXAMTOOL_ONE
*E-Exam Tool Description
1
EXAMTOOL_ONE - Example Online Assessment
Note: The Exam Seat Number and Exam Venue will only be available nearer the start of the examinations.
Information shown on this page is generated on 27 Oct 2026 03:52 PM
`;

test('parseExamSchedule reads rows of any length, day-first dates, and sorts by date', () => {
  const s = parseExamSchedule(EXAMS);
  assert.equal(s.term, '2025/2026 Semester 2');
  assert.equal(s.exams.length, 3);
  assert.deepEqual(s.exams[0], { code: 'EF4243', cls: 'L1', title: 'Example Vision Course', cut: false, mode: 'Closed Book (auth. materials)',
    date: '2026-04-30', start: '17:00', end: '19:00', venue: 'HALL-B', seat: '7', tool: 'EXAMTOOL_ONE' });
  // 02-05-2026 is 2 May, not 5 February.
  assert.equal(s.exams[1].date, '2026-05-02');
  assert.equal(s.exams[1].tool, null);
  assert.equal(s.exams[1].cut, true);
  assert.equal(s.exams[2].code, 'CD1001');
  assert.equal(s.exams[2].date, null);
  assert.equal(s.exams[2].venue, null);
  assert.deepEqual(s.tools, { EXAMTOOL_ONE: 'Example Online Assessment' });
  assert.equal(s.updated, '27 Oct 2026 03:52 PM');
});

test('parseExamSchedule leaves the By Date layout and empty terms alone', () => {
  assert.equal(parseExamSchedule('By Class\nBy Date\nThursday April 30\n1:00PM\nAB 2105-L2\nVenue: HALL-A\nSeat #: 19'), null);
  assert.equal(parseExamSchedule('An exam schedule is not available for this term.'), null);
});

test('examWhen places an exam relative to now', () => {
  const now = new Date(2026, 3, 30, 12, 0);
  assert.equal(examWhen({ date: '2026-04-30', end: '11:00' }, now), 'past');
  assert.equal(examWhen({ date: '2026-04-30', end: '19:00' }, now), 'today');
  assert.equal(examWhen({ date: '2026-05-02', end: '11:00' }, now), 'soon');
  assert.equal(examWhen({ date: '2026-06-02', end: '11:00' }, now), 'later');
  assert.equal(examWhen({ date: null }, now), 'tba');
});

test('parseSuHistory reads declared courses and the balance', () => {
  const r = parseSuHistory(`Instructions:
Courses Declared S/U
Semester
Course Code
Title
S/U Grade
Original Grade
Number of Units
2023/2024 Semester 1
AB1101
Example Methods
S
B+
4.00
2024/2025 Semester 2
CD2218
Example Platforms
S
B
4.00
Available S/U Balance: 4`);
  assert.equal(r.balance, 4);
  assert.deepEqual(r.rows[1], { term: '2024/2025 Semester 2', code: 'CD2218', title: 'Example Platforms', grade: 'S', original: 'B', units: 4 });
  assert.equal(parseSuHistory('Course Grades'), null);
  assert.equal(parseSuHistory('Courses Declared S/U\nAvailable S/U Balance:\n12').balance, 12);
});

// ---- Academic Records (text shaped like the live pages, values invented) ----

const { parseProgramme, parseCourses, parseTransferCredit, parseMilestones, parseClassList } = globalThis.EDR.parsers;

const PROGRAMME = `View Academic Programme
[As of Today]
2 rows
Career
Career Nbr
Program
Plan Type
Plan
Sub-Plan
Undergraduate
0
Bachelor of Examples
Honors
Example Studies (Hons)
Example Systems-TRK
Undergraduate
0
Bachelor of Examples
Special Plan
Example Residential Prog
Below table only reflect data if you have Program/Plan/Sub-Plan changes. If you don't find the data below, please refer to 'As of Today' table for your latest details.
[Latest Program/Plan/Sub-Plan changes as of March 02, 2026]
1 row
Career
Career Nbr
Program
Plan Type
Plan
Sub-Plan
Undergraduate
0
Bachelor of Examples
Honors
Example Studies (Hons)`;

test('parseProgramme reads both grids, with and without a sub-plan', () => {
  const p = parseProgramme(PROGRAMME);
  assert.deepEqual(p.current, [
    { career: 'Undergraduate', program: 'Bachelor of Examples', type: 'Honors', plan: 'Example Studies (Hons)', subplan: 'Example Systems-TRK' },
    { career: 'Undergraduate', program: 'Bachelor of Examples', type: 'Special Plan', plan: 'Example Residential Prog', subplan: '' }]);
  assert.equal(p.latest.asOf, 'March 02, 2026');
  assert.equal(p.latest.rows.length, 1);
  assert.equal(p.latest.rows[0].subplan, '');
  assert.equal(parseProgramme('Course Grades'), null);
});

const COURSES = `2025/2026 Semester 2 | Undergraduate | NUS
Course Grades
Course Code
Description
Units
Grading Basis
Status
AB2101
EXAMPLE DESIGN AND ARCHITECTURE
4.00
Graded
Enrolled
CD1201X
EXAMPLE LANGUAGE 1
4.00
Satisfactory/Unsatisfactory
Enrolled
EF3001
EXAMPLE SCIENCE
2.00
Graded
Drop with ‘Withdrawn (W)’ Grade`;

test('parseCourses reads the term key and every course row', () => {
  const c = parseCourses(COURSES);
  assert.equal(c.term, '2025/2026 Semester 2');
  assert.equal(c.career, 'Undergraduate');
  assert.equal(c.courses.length, 3);
  assert.deepEqual(c.courses[1], { code: 'CD1201X', title: 'Example Language 1', units: 4, basis: 'Satisfactory/Unsatisfactory', status: 'Enrolled' });
  assert.equal(c.courses[2].status, 'Drop with ‘Withdrawn (W)’ Grade');
  // Exam results also says "Course Grades" but has no Grading Basis column.
  assert.equal(parseCourses(RESULTS), null);
});

const TRANSFER = `Course Credits
Model Nbr
1
Posted
Institution
NUS
Credit Source Type
External
Career
Undergraduate
Source Institution
Example State University
Program
Bachelor of Examples
3 rows
Transfer Term
Incoming Course
Units Taken
Grade Input
Status
Equivalent Subject / Catlg Nbr
Units
Grade
Notes
2025/2026 Semester 1
EXMP 3250
3.00
A
Posted
AB 3240
4.000
OVS
2025/2026 Semester 1
EXMP 6610
3.00
Posted
AB 3230
4.000
OVS
Approved by department
2025/2026 Semester 1
EXMP 2810
Units Taken
3.00
B
Posted
CD 5242
4.000
Test Credits
No test credits found.`;

test('parseTransferCredit reads the source and rows with empty cells', () => {
  const t = parseTransferCredit(TRANSFER);
  assert.equal(t.models.length, 1);
  const m = t.models[0];
  assert.equal(m.source, 'Example State University');
  assert.equal(m.status, 'Posted');
  assert.deepEqual(m.courses[0], { term: '2025/2026 Semester 1', incoming: 'EXMP 3250', taken: 3, gradeIn: 'A', status: 'Posted', equiv: 'AB3240', units: 4, grade: 'OVS', notes: '' });
  assert.equal(m.courses[1].gradeIn, '');
  assert.equal(m.courses[1].notes, 'Approved by department');
  // A cell label shown on a narrow screen is skipped; an empty grade stays empty.
  assert.deepEqual([m.courses[2].taken, m.courses[2].grade, m.courses[2].equiv], [3, '', 'CD5242']);
  assert.equal(t.noTests, true);
  assert.equal(parseTransferCredit('Course Grades'), null);
});

const MILESTONE_HEAD = 'Milestone\nMilestone Level\nMilestone Complete\nHow Completed\nDate Attempted\nMilestone Grade\nDetails\nComments\nDummy Field\n';

test('parseMilestones treats a grid of bare labels as no milestones', () => {
  const empty = parseMilestones(MILESTONE_HEAD + 'Milestone\nMilestone Level\nMilestone Complete\nHow Completed\nDate Attempted\nMilestone Grade\nDetails\nComments');
  assert.deepEqual(empty, { rows: [] });
  const one = parseMilestones(MILESTONE_HEAD + 'Milestone\nExample Qualifying Exam\nMilestone Level\nMilestone Complete\nYes\nHow Completed\nExamination\nDate Attempted\n12/05/2026\nMilestone Grade\nPass\nDetails\nComments');
  assert.deepEqual(one.rows, [{ name: 'Example Qualifying Exam', complete: 'Yes', how: 'Examination', date: '12/05/2026', grade: 'Pass' }]);
  assert.equal(parseMilestones('Milestone'), null);
});

// The live By Class page: no term line, all dates, then all times, then all rooms.
const BY_CLASS_LIVE = `By Class
By Date
Please note that there will be no classes on public holidays.
The course instructor(s) will advise on make up classes, if any.
AB 2101   Example Designs and Architectu
Class
Start/End Dates
Days and Times
Room
18/08/2026 - 18/08/2026
25/08/2026 - 25/08/2026
08/09/2026 - 08/09/2026
Days: Tuesday
Times: 2:00PM to 3:00PM
Days: Tuesday
Times: 2:00PM to 3:00PM
Days: Tuesday
Times: 2:00PM to 3:00PM
ROOM-1
ROOM-1
ROOM-2
13/08/2026 - 13/08/2026
20/08/2026 - 20/08/2026
Days: Thursday
Times: 10:00AM to 12:00PM
Days: Thursday
Times: 10:00AM to 12:00PM
HALL-1
HALL-1
CD 1001   Example Science
Class
Start/End Dates
Days and Times
Room
10/08/2026 - 10/08/2026
Days: Monday
Times: 6:00PM to 9:00PM
HALL-2
03/08/2026 - 05/12/2026
Schedule: To be Announced
To be Announced`;

test('parseClassList groups each course’s meetings into weekly slots', () => {
  const c = parseClassList(BY_CLASS_LIVE);
  assert.equal(c.courses.length, 2);
  const [a, b] = c.courses;
  assert.equal(a.code, 'AB2101');
  assert.equal(a.cut, true);
  assert.deepEqual(a.slots, [
    { day: 'Tuesday', start: '14:00', end: '15:00', room: 'ROOM-1', first: '2026-08-18', last: '2026-08-25', count: 2 },
    { day: 'Tuesday', start: '14:00', end: '15:00', room: 'ROOM-2', first: '2026-09-08', last: '2026-09-08', count: 1 },
    { day: 'Thursday', start: '10:00', end: '12:00', room: 'HALL-1', first: '2026-08-13', last: '2026-08-20', count: 2 }]);
  assert.equal(a.tba, false);
  assert.equal(b.slots.length, 1);
  assert.equal(b.tba, true);
  assert.equal(parseClassList(BY_DATE), null);
});

test('timetable parsers keep their output on the live, term-less layouts', () => {
  const slots = parseSlots(BY_CLASS_LIVE);
  assert.equal(slots.term, null);
  assert.deepEqual(slots.slots, [
    { code: 'AB2101', day: 'Tuesday', start: '14:00', end: '15:00' },
    { code: 'AB2101', day: 'Thursday', start: '10:00', end: '12:00' },
    { code: 'CD1001', day: 'Monday', start: '18:00', end: '21:00' }]);
  const s = parseSessions(`By Class
By Date
From
To
Please note that there will be no classes on public holidays.
Monday August 10
6:00PM
CD 1001 Lecture
Room: HALL-2
Status: Enrolled`);
  assert.equal(s.term, null);
  assert.equal(s.sessions.length, 1);
  assert.deepEqual(Object.keys(s.sessions[0]), ['date', 'start', 'code', 'type', 'room', 'status']);
  assert.equal(s.sessions[0].code, 'CD1001');
});

// ---- Personal Info (layouts from the 27 Oct 2026 crawl; values invented) ----

const PI_HEAD = 'Skip to Main Content\nMy Homepage\nActions\nPersonal Info\nStudent ID\nA0000000X\n';

test('parseDemographic reads the facts and the ID, citizenship and medical grids', () => {
  const { parseDemographic } = globalThis.EDR.parsers;
  const d = parseDemographic(PI_HEAD + `Demographic Information
Student ID
A0000000X
Official Name
EXAMPLE STUDENT NAME
Gender
Female
Date of Birth
01/02/2003
Marital Status
Single
Current Residency Status
Permanent Resident
Identification Type/Number
National ID Type
National ID
NRIC
S0000000Z
Citizenship Information
Country
Description
Birth Country
Exampleland
Citizen
Exampleland
Pre-Admission Medical Examination
Status
Expiry Date (If any)
Completed`);
  assert.deepEqual(d, {
    id: 'A0000000X', name: 'EXAMPLE STUDENT NAME', gender: 'Female', dob: '01/02/2003', marital: 'Single', residency: 'Permanent Resident',
    ids: [{ type: 'NRIC', number: 'S0000000Z' }],
    citizenship: [{ country: 'Exampleland', status: 'Citizen', birth: 'Exampleland' }],
    medical: { status: 'Completed', expiry: null }
  });
  // MyInfo repeats the labels but is a form.
  assert.equal(parseDemographic('MyInfo Demographic Information\nStudent ID\nA0000000X\nOfficial Name\nEXAMPLE\nGender\nFemale\nReset\nSave'), null);
});

test('parseNames reads one row per name type', () => {
  const { parseNames } = globalThis.EDR.parsers;
  assert.deepEqual(parseNames(PI_HEAD + 'Names\nNames\nOfficial Name\nName\nType\nEXAMPLE STUDENT NAME\nMs EXAMPLE NAME\nPrimary\nEXAMPLE STUDENT NAME\nMs EXAMPLE NAME\nPreferred').names, [
    { official: 'EXAMPLE STUDENT NAME', name: 'Ms EXAMPLE NAME', type: 'Primary' },
    { official: 'EXAMPLE STUDENT NAME', name: 'Ms EXAMPLE NAME', type: 'Preferred' }]);
  assert.equal(parseNames('Contact Details\nEmail'), null);
});

test('parseContact reads emails, phones and the empty social list', () => {
  const { parseContact } = globalThis.EDR.parsers;
  const c = parseContact(PI_HEAD + `Contact Details
Email
Email
Type
Preferred
E0000000@U.NUS.EDU
NUS
student@example.com
Personal
Social Media Links
No Social Media Accounts are defined.
Add Social Account
Phone
Phone
Type
Preferred
+65 90000000
Mobile (Singapore)
+65 60000000
Home`);
  assert.deepEqual(c.emails, [{ address: 'E0000000@U.NUS.EDU', type: 'NUS' }, { address: 'student@example.com', type: 'Personal' }]);
  assert.deepEqual(c.phones, [{ number: '+65 90000000', type: 'Mobile (Singapore)' }, { number: '+65 60000000', type: 'Home' }]);
  assert.deepEqual(c.social, []);
});

test('parseAddresses reads each kind, its lines and the empty ones', () => {
  const { parseAddresses } = globalThis.EDR.parsers;
  const a = parseAddresses(PI_HEAD + `Addresses
Mailing Address
Address
From
Singapore
100001
Block 1
Example Avenue 2
#01-01
SINGAPORE
Current
Home Address
Address
From
Singapore
100002
2 Example Road
01/07/2026
Billing Address
No address defined
Add Billing Address`);
  assert.deepEqual(a.kinds, [
    { title: 'Mailing Address', addresses: [{ country: 'Singapore', postal: '100001', lines: ['Block 1', 'Example Avenue 2', '#01-01'], from: 'Current' }] },
    { title: 'Home Address', addresses: [{ country: 'Singapore', postal: '100002', lines: ['2 Example Road'], from: '01/07/2026' }] },
    { title: 'Billing Address', addresses: [] }]);
  const p = parseAddresses(PI_HEAD + 'Payment Address\nAddress\nFrom\nSingapore\n100001\nBlock 1\nExample Avenue 2\n#01-01\nCurrent');
  assert.deepEqual(p.kinds, [{ title: 'Payment Address', addresses: [{ country: 'Singapore', postal: '100001', lines: ['Block 1', 'Example Avenue 2', '#01-01'], from: 'Current' }] }]);
  assert.equal(parseAddresses('Names\nOfficial Name'), null);
});

test('parseEmergency reads contacts and phones', () => {
  const { parseEmergency } = globalThis.EDR.parsers;
  assert.deepEqual(parseEmergency(PI_HEAD + 'Emergency Contacts\nContact\nPhone\nPrimary\nEXAMPLE PARENT NAME\n65 90000001').contacts, [{ name: 'EXAMPLE PARENT NAME', phone: '65 90000001' }]);
});
