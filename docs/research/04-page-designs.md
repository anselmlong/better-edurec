# Page designs

Mode: **Operate**. A student opens a page to look one thing up. The page leads with that answer.
The visual world is the existing one (Campus theme, `--edr-*` tokens, 12 themes); these are
layouts and components built on it, not a new look. No personal data in this file.

## Three patterns

Every EduRec sub-page is one of three types. Each type has one pattern, used the same way everywhere.

### 1. Data page → answer view

For pages that show the student's own records (results, exam schedule, S/U history, programme,
courses, milestones, transfer credit, financial aid).

- **The view replaces EduRec's grids.** The parsed view (`.edr-view`) goes first in EduRec's content
  column. EduRec's grids and the notes the view restates get `.edr-orig` and are hidden, not
  moved or removed. A quiet "Show EduRec's version" toggle at the foot of the view brings them back.
- **Structure, top to bottom:**
  1. *Head:* a title (what this is) and a one-sentence lede that answers the question
     ("Next: AB1234 on Thursday 30 April, 1:00 PM at HALL-A, seat 12."). No eyebrow labels and
     no stat-tile rows; one number may be set large inside the sentence (S/U units left).
  2. *Body:* one list of rows, never a table on phones. Each row has a mono course code, a
     sentence-case title, and right-aligned facts (grade badge, date, units). On wide screens
     rows read as aligned columns; under 640px they stack.
  3. *Foot:* EduRec's caveats as one muted line each ("Seats are assigned nearer the exams"),
     "Updated …" from EduRec's own timestamp, and the original-view toggle.
- **Term context stays EduRec's.** The name, term and **Change** control above the view are
  EduRec's, so picking another term still works the PeopleSoft way.
- **Status words become tags:** passed / OK states use `.edr-tag.is-ok`, attention states use
  `.is-warn`, neutral facts (TBA, CS) use `.is-quiet`.
- Parsers read text; each new one gets a `node:test` case and a harness fixture.

### 2. Form page → task layout

For pages where the student does something (special consideration, S/U declaration, exam result
review, transcript requests, LOA, course registration).

- EduRec's fields and buttons stay where PeopleSoft put them and keep working. Only classes and
  one inserted intro are added.
- **Intro (`.edr-task`)** above the form: what the page does in one sentence, plus the one or two
  rules that matter before acting. Rules come only from EduRec's own text on that page,
  shortened; never new claims. Pages with nothing to add get no intro.
- **Instructions** fold to their opening lines (`layout.js`, existing) and read at 72ch.
- **Action rows:** a group holding only buttons (`.edr-actions`) aligns left with the content,
  buttons at 40px height, wrapping on phones. EduRec decides which is primary; we don't relabel.

### 3. Dead end → empty state

For pages that only say no: not eligible, period closed, nothing for this term, retired feature,
error.

- **Panel (`.edr-dead`)** replaces EduRec's message (message block gets `.edr-orig`): an icon, a plain
  title saying what is unavailable, one line on why or when, and actions out of the dead end.
- **Actions** are read-only navigation only: open another sub-page in the same tile, open
  **Change** (term picker), or EduRec's Back. Never a submit.
- EduRec's exact message stays available under "EduRec's message" so nothing is paraphrased away.

## Examinations

| Sub-page | Type | Design |
|---|---|---|
| Access Special Consideration | form | Intro: apply for this semester or look up a past application; rules from EduRec's list (no changes after submitting, outcome released with results). Two action buttons in one row. |
| View Exam Schedule | data | Exam list sorted by date: date block (weekday, day, month), course, mode and e-exam tool, then time, venue and seat. Lede: the next exam, or "all done". TBA exams last. Past exams muted with a Done tag; within a week, "In N days". By Date layout is left to EduRec. |
| View Exam Schedule, no term data | dead end | "No exam schedule for this term yet" + Change term. |
| Subscribe to SMS Notification | dead end | "SMS results alerts have been retired" + open View Exam Results. |
| View Exam Results | data | Existing parser and Overview snapshot unchanged. Lede: GPA and standing. Course rows with grade badges; units in the foot. |
| Review Exam Results Request | form | Intro: ask for a result to be reviewed, or check past requests. |
| Submit S/U Declarations | form | Intro: S/U lets you swap a letter grade for S or U; declarations can be changed until the exercise closes. Two buttons as an action row. |
| View Past S/U Declarations | data | Stat: S/U units left (big). Rows by semester: course, original grade → S/U grade, units. |
| Declare S/U (closed) | dead end | "S/U declaration is closed" + View past declarations. |
| View Unofficial Transcript | form | Intro: choose a report type for your programme, then Submit. No guess at which type. |
| S/U Original Grade Letter | form | Intro: one sentence; single button. |

## Academic Records

| Sub-page | Type | Design |
|---|---|---|
| View Academic Programme | data | Lede: programme, main plan and sub-plan in one sentence ("-TRK" reads "track"). One row per plan: plan name, programme · sub-plan, plan type as a quiet tag. The "Latest changes" grid shows as a second section only when it differs from "As of Today"; otherwise one foot line with its date. Career in the foot. |
| View Student Status Letter | form | Intro: "Select a programme to get your student status letter." The programme list stays EduRec's (the row starts the letter, so the intro says nothing about what it produces). |
| View Courses, term list | picker | Left as EduRec's "Select A Term" list; it is navigation, not data. |
| View Courses, one term | data | Title "Courses · term" (not "Course Grades": there are no grades here). Lede: courses and units still on, then withdrawn and S/U counts. Rows: code, title, units, tags for S/U grading and any status other than Enrolled ("Withdrawn (W)" as a warn tag, the row muted and struck through). |
| Term and Course Enrollment, not eligible | dead end | "You can’t declare courses here" + View your courses. |
| View Classes, By Date | data | Lede: the next class, day, time and room. Rows from now on: date block, course and class type, start time and room; earlier meetings fold under "Earlier this term (N)". Feeds the Overview as before (same parser and snapshot, Summary badge). |
| View Classes, By Class | data | Lede: courses and classes a week. Per course: each weekly slot as day and time, room, and the weeks it runs ("12 weeks, 11 Aug – 3 Nov"); a TBA component gets one muted line. No Lecture/Tutorial label: EduRec's By Class text has none. The timetable snapshot stays parseSlots' output. |
| View Milestones | data / dead end | Rows with milestone, level, how and when completed, grade, and a Complete tag. An all-empty grid is "No milestones on your record" + View your programme, with EduRec's grid behind the toggle. |
| View Transfer Credit Report | data | Lede: units transferred, source institution, course count and whether all are posted. Rows: NUS equivalent (mono) "for" the incoming course, term and units taken with the grade input, NUS units and the grade badge (e.g. OVS). "No test credits found." in the foot; test credits, when present, stay visible as EduRec's. |
| Apply for Leave of Absence | form | Intro with three rules from EduRec's notes: semester-leave deadline (last day of Recess Week), fees after Instructional Week 2, closed from Reading Week to results. EduRec's entry pop-up, notes and Next stay as they are. |
| EP Eligibility Letter | dead end | "The EP eligibility letter is for international students" + Student status letter. |
| Student Requests | form | Intro: submit a new request or view past ones. Same wording as Review Exam Results, so both intros are gated on the selected page-list item. |
