⚠️ DEGRADED: single-context (target is an authenticated third-party production site — detector script injection and sub-agent re-crawls of the user's logged-in session were not appropriate; evidence = live read-only crawl of ~60 pages, screenshots and DOM text)

# EduRec — impeccable critique

Mode: **Operate** (students complete look-up tasks: "what's my grade / when's my exam / am I on track to graduate / did my scholarship pay out").

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Home says "No current tasks" and nothing else. No current term, no next exam, no registration round open/closed, no outstanding bill. Status lives 3 clicks deep. |
| 2 | Match System / Real World | 1 | PeopleSoft vocabulary leaks everywhere: "Career Nbr", "Acad. Plans 0300CSHON", "Req Term 2310", "Report Type AAGS", "Fluid Component", "MD", "Possible Actions 1 / 2", "OVS". Page titles like "RT225497 - Req Des MD componen". |
| 3 | User Control and Freedom | 1 | Back button label shows the *previously visited app* ("← Fieldwork Management System" inside CourseReg). Browser back breaks postbacks. Blocking modal on entering Leave of Absence. |
| 4 | Consistency and Standards | 1 | Three visual generations coexist: Fluid tiles, Fluid master-detail, and classic 2008-era iframes (Degree Audit, Global Ed) with tiny serif headers and "First 1-9 of 9 Last" pagers. Orange, blue and red tile colours encode nothing. |
| 5 | Error Prevention | 2 | Ineligible features (Commencement, Requirement Designation, EP Letter, DYOC, Term Enrollment) are fully shown and only reveal "You are not eligible" after a click. |
| 6 | Recognition Rather Than Recall | 1 | Same term picker re-asked on every page (View Courses, View Classes, Exam Schedule, Exam Results) — 8 identical rows reading "National University of Singapore / Undergraduate". Student must remember that grades live under *Examinations*, not *Academic Records*. |
| 7 | Flexibility and Efficiency | 0 | No search, no deep links (URLs are opaque & session-numbered), no keyboard shortcuts, Favourites empty by default, 4-page swipe carousel on desktop. |
| 8 | Aesthetic and Minimalist Design | 1 | Giant clip-art tiles occupy the whole first viewport and carry zero data. Inside pages: walls of policy text above the actual content; Programme table duplicated verbatim. |
| 9 | Error Recovery | 0 | Manage Student Financials: "An error has occurred that has stopped this transaction from continuing." No retry, no explanation, no contact link. |
| 10 | Help and Documentation | 2 | A "User Guides" tile exists (How to view exam results…) — the fact that guides are needed to read your own grades is the indictment. |
| **Total** | | **10/40** | **Poor** |

## Design Specificity Verdict

The interface is fully category-interchangeable — it is stock Oracle PeopleSoft Fluid with an NUS crest pasted top-left. Nothing in the composition knows it serves an undergraduate checking a GPA two days after results release. The tiles are *menu items wearing posters*: a megaphone, a star, a dollar clipboard. The real product — a student's academic life as a timeline of terms, courses, grades and requirements — is never surfaced as a shape.

Deterministic scan: not run (see banner). Manual equivalents found: tiny low-contrast grey 11–12px table text in legacy iframes; centred page titles with left-aligned content; truncated course names at fixed width ("Introduction to Computer Netwo"); all-caps course titles in grades tables.

## Overall Impression
EduRec is a **database browser, not a student tool**. Every screen answers "which table do you want to open?" instead of "here's what matters to you right now." Biggest opportunity: **invert the IA from modules to moments** — a home that already shows this term, next exam, latest results, graduation progress and money, with every module one click away via search.

## What's Working
- **Consistent master-detail shell inside Fluid tiles** — the left list + right pane pattern is learnable; keep the idea, fix the labels.
- **Data completeness** — the degree audit already computes "160 required, 144 taken, 16 needed" per requirement. The hard part (the rules engine) exists; it's just presented as a tree of grey text.
- **Status vocabulary exists** (Enrolled, Posted, Passed/Proceed, Satisfied/Not Satisfied) — a ready-made semantic colour system.

## Priority Issues

**[P0] Home page carries zero information**
- Why: 100% of visits start here; every task costs 2–4 extra clicks and a remembered path.
- Fix: Replace tiles with a "Today" dashboard: current term + enrolled courses, next exam countdown, latest results & GPA trend, graduation progress (units needed), money (last disbursement / bill due), open windows (CourseReg round, S/U deadline).
- Command: /impeccable shape → distill

**[P0] Grades split across Academic Records, Examinations and Transcripts; GPA only cumulative**
- Why: The #1 student task is fragmented and the term GPA cell is literally blank.
- Fix: One "Results" view: term timeline, per-term GPA + cumulative GPA chart, grades with S/U state, one-click unofficial transcript.
- Command: /impeccable layout

**[P1] Degree audit is unreadable legacy iframe**
- Why: "Am I graduating on time?" is the highest-stakes question; the answer is "Not Satisfied" in small red text above a collapsed tree.
- Fix: Requirement cards with progress bars (units taken / needed), courses as chips, unused courses flagged, what-if planning inline. Keep the detailed table as source of truth (UBC lesson: a single % ring misleads).
- Command: /impeccable clarify + layout

**[P1] No timetable anywhere**
- Why: "View My Classes" lists class codes (L1, T13) with no day, time or venue — students leave EduRec for NUSMods to see their week.
- Fix: Week grid timetable with lecture/tutorial blocks, venue, plus exam schedule overlay.
- Command: /impeccable shape

**[P1] Dead ends, eligibility surprises and a crashing financials page**
- Why: Erodes trust; students can't tell broken from not-applicable.
- Fix: Hide or collapse ineligible features into a "Not applicable to you (5)" drawer with reasons; financials must fail gracefully with retry + contact.
- Command: /impeccable harden

## Persona Red Flags

**Jordan (First-year, first results day):** lands on 8 orange posters; "Academics" tile silently swipes to a second carousel page of 11 blue posters; grades are under "Examinations → View Exam Results → pick term" — 4 decisions, none labelled "grades". Term GPA blank.

**Alex (Year-3 power user, CourseReg week):** no search, no deep link to "Select Tutorials"; back button sends them to the wrong app; class list has no times so they juggle NUSMods in another tab; session-numbered URLs can't be bookmarked.

**Sam (Mobile, on the bus):** tiles reflow to single column = 21 screen-heights of clip-art; legacy iframe audit report doesn't reflow; 13-column Global Ed grid is unusable.

**Priya (Exchange student returning):** Transfer credit report says grade "OVS" with no explanation; exchange application status "Ext Study Accepted by Host" sits in a 13-column grid with "NA NA NA" in action columns.

## Minor Observations
- Programme table rendered twice ("As of Today" + "Latest changes as of Aug 04 2025") with identical rows.
- ALL-CAPS course titles in results; title-case elsewhere.
- Announcements tile routes into the Fieldwork landing page.
- Report-type dropdown on Transcripts lists 8 career types irrelevant to an undergrad.
- "You are not eligible for commencement registration !" — stray space before "!".
- Instruction walls: Special Consideration has 6 numbered paragraphs before two buttons.
- Page title spelling: "sumbitted".

## Questions to Consider
- What if the home page *was* your academic record — a living timeline you scroll?
- What if every PeopleSoft module became a filter on one search box ("exam", "transcript", "LOA")?
- Does a student ever need to "select a term" when the system knows today's date?
- What would EduRec look like if NUSMods' team had designed it?

Questions skipped: user is away and asked to proceed straight to the redesign.
