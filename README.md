# EduRec Reskin

A personal, unofficial Chrome extension that reskins NUS EduRec in your own browser. It is read-only: it never submits forms or changes anything in EduRec. Anything that writes, such as course registration, leave of absence or payments, still happens on the original EduRec pages.

Not affiliated with or endorsed by NUS.

## What it does

- **Sidebar and search on every page.** It groups EduRec's 21 tiles into 9 sections. Press ⌘K (Ctrl K on Windows) to search every tile and sub-page, e.g. "transcript", "S/U" or "leave".
- **An Overview page instead of the tile homepage.** It shows your GPA, degree progress, classes this semester and financial aid, plus links to every part of EduRec.
- **Summary cards on EduRec pages:**
  - **Exam results:** term, cumulative GPA, units and grade chips.
  - **Graduation audit report:** units done out of required, plus each unmet requirement with a progress bar.
  - **View My Classes (CourseReg):** each course with its lecture and tutorial groups.
  - **Financial aid:** the total disbursed and the latest payment.
- **A light restyle of EduRec itself:** type, colours, buttons and tables.
- **Classic view.** One click turns everything off. The toolbar popup also has the switch.

## How data is handled

The extension only reads the EduRec page you're looking at. When it recognises one of the four pages above, it saves a small summary in `chrome.storage.local` so the Overview can show it. Nothing is sent anywhere, and the extension makes no network requests of its own. You can clear the saved summaries from the toolbar popup.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. Sign in to EduRec as usual. The Overview cards fill in as you open each page:
   - Examinations › View exam results › pick a semester
   - Degree progress › View graduation audit report
   - Course registration › View my classes
   - Financial aid

Fonts: it uses Public Sans and IBM Plex Mono if they're installed, and falls back to your system font otherwise.

## Develop

No build step. The content scripts are plain JavaScript loaded in the order listed in `manifest.json`.

```
npm test        # parser and routing unit tests (node:test)
npm run check   # syntax check every script
npm run pack    # zip for sharing
```

To try the UI without EduRec, open the local harness. It runs the real scripts against fake PeopleSoft-style pages with invented data:

```
python3 -m http.server 8765
# then open http://localhost:8765/test/harness/index.html?page=results
# pages: results, audit, classes, finaid, home
```

| File | Role |
|---|---|
| `src/routes.js` | Tile URLs, sidebar sections, page detection, search index |
| `src/parsers.js` | Pure text parsers for the audit, results, classes and financial aid pages |
| `src/enhancers.js` | Recognises pages, inserts summary cards, saves snapshots |
| `src/overview.js` | Overview dashboard on the homepage |
| `src/shell.js` | Sidebar, search palette, classic-view toggle |
| `src/theme.css` | Restyle and component styles, all scoped to `html.edr-on` |

The parsers read page text rather than PeopleSoft markup, so small layout changes usually don't break them. If NUS changes a page's wording, update the matching parser and its test.

## Background

`docs/research` has the crawl inventory, comparable designs and the design critique (10/40) that motivated this. `docs/prototype` has the Claude Design prototype source, with invented data.

## Limitations

- Only tested against the EduRec layout as of October 2026.
- The Overview only knows what you've opened since installing. There is no background syncing, by design.
- Exam schedule, transcripts and the rest keep EduRec's own layout, inside the new shell.
