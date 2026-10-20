# EduRec — site inventory (crawled 2026-10-20, read-only)

Platform: Oracle PeopleSoft Campus Solutions 9.x, "Fluid" UI. Every page is a server postback
(`submitAction_win2(...)`); URLs are opaque (`psc/cs90prd_NN/...GBL?...`), the `cs90prd_NN`
window number increments on every tile open. No real personal data is recorded here.

## Global chrome
- Header: NUS crest (left), Home, ⋮ Actions (New Window, Help, Sign Out), NavBar compass (right).
- Landing page selector "My Homepage ▾" + "‹ 1 of 4 ›" swipe carousel between 4 landing pages.
- Inside a tile: left "master-detail" side nav (icon + label list), page title centered in header,
  "← <previous app>" back button top-left (label is frequently WRONG — shows the app visited
  before, e.g. "← Fieldwork Management System" while inside CourseReg).

## Landing pages (4) and their tiles (21 total)
1. **My Homepage** (orange tiles): Announcements ("No current tasks"), My Favourites, Personal Info,
   Academics (→ jumps to landing 2), Financials (→ landing 3), Dynamic Course Registration,
   Fieldwork Management System, User Guides & Useful Links.
2. **Academics** (blue tiles): Registration & Declarations, Academic Records, Degree Progress/AFG,
   Course Registration, Global Education, Examinations, Acad Plan Appln / Declaration,
   Design Your Own Course, Requirement Designation, Transcripts, Commencement Registration.
3. **Financials** (red tiles): Manage Student Financials, View Financial Aid.
4. **Fieldwork Management System**: one tile.

## Tile → sub-pages
| Tile | Left-nav sub-pages | Content notes |
|---|---|---|
| Personal Info | Demographic Information, Names, Contact Details, Addresses, Emergency Contacts, Payment Advice, MyInfo Demographic Information | Photo, ID, name, DOB, residency, NRIC table, citizenship table, pre-admission medical |
| Academic Records | View Academic Programme, View Student Status Letter, View Courses, Term and Course Enrollment, View Classes, View Milestones, View Transfer Credit Report, Apply for Leave of Absence, EP Eligibility Letter, Student Requests | Programme table shown TWICE ("As of Today" + "Latest changes"); View Courses/Classes = term picker list → table; LOA throws a blocking modal on entry; EP letter = "only for international students"; Term&Course Enrollment = "You are not eligible" |
| Degree Progress/AFG | Information, View Graduation Audit Report, View What-if Report, Apply for Graduation (AFG), View Graduation Status | Audit report is a legacy (non-Fluid) iframe: requirement tree w/ "Not Satisfied", units required/taken/needed, course tables with "First 1-9 of 9 Last" pagination, truncated course names ("Introduction to Computer Netwo") |
| Course Registration (CourseReg) | About CourseReg, View My Classes@CourseReg, Select Courses, Submit Course Requests, Select Tutorials/Labs, Add/Swap Tutorials/Labs, Drop Classes, Submit Appeals/Inquiries | My Classes lists class codes (L1/T13) + status, **no day/time/venue — no timetable view** |
| Examinations | Access Special Consideration, View Exam Schedule, Subscribe to SMS Notification, View Exam Results, Review Exam Results Request, Submit S/U Declarations, View Unofficial Transcript, S/U Original Grade Letter | Results: term picker → course/grade table + units table; only cumulative GPA shown (term GPA blank); 6-paragraph instruction wall on Special Consideration |
| Transcripts | View Unofficial Transcript, Apply Official Transcript, Check Application Status, View Student Life Transcript | Report-type dropdown with 8 options irrelevant to most students → Submit → PDF |
| Global Education | External Study Application, Search Course Mappings, Submit Course Mapping | Legacy iframe grid with 13 columns ("Possible Actions 1", "Possible Actions 2"…) |
| Acad Plan Appln / Declaration | Declare Academic Plan, Apply for Restricted Plan, Check Application Outcome | Career picker first |
| Design Your Own Course | DYOC (Group) | "Application period is not Open" |
| Requirement Designation | View RD Records, Update RD Records, Update Previous Term Records | "Only for Double Degree" |
| Commencement Registration | — | "You are not eligible for commencement registration !" |
| Registration & Declarations | Information, QET/DET Registration, Authorisation Requirements, Declaration of Transfer Option | Bullet wall of instructions |
| Manage Student Financials | (fails) | "An error has occurred that has stopped this transaction from continuing." — no recovery path |
| View Financial Aid | — | Filter (All Terms Yes/No, Term From/To, GO) → 7-row table of disbursements |
| Fieldwork Management | Information, Fieldwork Log Sheet | About text: View Log, Add Entry, Add Disruption, Progress Status |
| Dynamic Course Registration | Information, Book Session, My Confirmed Session, Drop Session (+ Choose Round) | Workshop booking (e.g. Respect & Consent), long policy text |
| User Guides & Useful Links | — | 3 lists of links (How to view exam schedule/results/transcript; navigate; finance; personal info; MyPortal, IT Care, Canvas) |
| My Favourites | — | "No favorites" |
| Announcements | — | "No current tasks" (tile opens into the FMS landing page — broken routing) |

## Data model (what a student actually comes here for)
- Identity & contact (profile, addresses, emergency contacts, bank/payment advice)
- Programme (degree, major, honours plan, sub-plan/track, special programme e.g. RC)
- Terms → enrolled courses (code, title, units, grading basis, status) → classes (lecture/tutorial)
- Results per term (grade per course, term units, cumulative GPA, academic standing)
- Degree audit (requirement groups, units required/taken/needed, courses used, unused courses)
- Exams (schedule per term, S/U declarations, special consideration, results review)
- Transfer credit (exchange courses → NUS equivalents, units, grade "OVS")
- Exchange/global ed applications (status pipeline), course mappings
- Money: bills/payments (Manage Student Financials), financial aid / scholarship disbursements
- Documents: unofficial/official transcript, status letter, EP letter, S/U grade letter
- Requests & applications: LOA, student requests, plan declaration, AFG, DYOC, commencement
- Workshops (DCR) and fieldwork logs
