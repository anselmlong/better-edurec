# EduRec Reskin

A personal, unofficial Chrome extension that reskins NUS EduRec in your own browser. It is read-only: it never submits forms or changes anything in EduRec. Anything that writes, such as course registration, leave of absence or payments, still happens on the original EduRec pages.

Not affiliated with or endorsed by NUS.

## What it does

- **Sidebar and search on every page.** It groups EduRec's 21 tiles into 9 sections. Press ⌘K (Ctrl K on Windows) to search every tile and sub-page, e.g. "transcript", "S/U" or "leave".
- **An Overview page instead of the tile homepage.** It shows your GPA, degree progress and classes this semester, plus links to every part of EduRec. One click (Set up Overview) fills it; it's optional and can be turned off from the toolbar popup.
- **Summary cards on EduRec pages:**
  - **Exam results:** term, cumulative GPA, units and grade chips.
  - **Graduation audit report:** units done out of required, plus each unmet requirement with a progress bar.
  - **View My Classes (CourseReg):** each course with its lecture and tutorial groups.
  - **Financial aid:** the total disbursed and the latest payment.
- **A light restyle of EduRec itself:** type, colours, buttons and tables.
- **Live timetable:** an Up next card (what's on now or next, room, countdown) and a NUSMods-style week grid with a moving now-line, built from Academic Records › View Classes. **Open in NUSMods** exports your class groups as a NUSMods share link; only course codes are sent to NUSMods' public API, and only when you click it.
- **Quick links:** one click to the exact sub-page for the unofficial transcript, exam results and schedule, course registration, timetable, degree audit, S/U declarations, status letter and leave of absence. Search shows them first.
- **12 themes:** Campus (default), Dark, Girlypop, Terminal, Monokai, Dracula, Nord, Solarized Light, Gruvbox, Catppuccin, Rosé Pine and Tokyo Night. Pick one from the sidebar's Theme button, `t`, `:theme <name>`, or the toolbar popup. Arrowing through the picker previews each theme; Esc reverts. Every theme passes WCAG AA contrast for body text (checked by `test/themes.test.mjs`).
- **Vim-style keyboard control:** `j`/`k` move, `h`/`l` switch panes (sidebar, EduRec's page list, content), `gg`/`G` first and last, `d`/`u` half-page scroll, `/` search, `:` command line, `H`/`L` back and forward, `1`–`9` sidebar sections, `[`/`]` collapse the sidebar or page list, `?` shows every shortcut.
- **Classic view.** One click turns everything off. The toolbar popup also has the switch.

## How data is handled

The extension only reads the EduRec page you're looking at. When it recognises one of the four pages above, it saves a small summary in `chrome.storage.local` so the Overview can show it. Nothing is sent anywhere, and the extension makes no network requests of its own. You can clear the saved summaries from the toolbar popup.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. Sign in to EduRec and click **Set up Overview** on the Overview. It reads exam results, your graduation audit and your classes, then returns. Each card also fills on its own whenever you open its page (or click **Collect** on it).

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
npm run harness
# then open http://127.0.0.1:8765/test/harness/index.html?page=results
# pages: results, audit, classes, finaid, home
```

| File | Role |
|---|---|
| `src/routes.js` | Tile URLs, sidebar sections, page detection, search index |
| `src/parsers.js` | Pure text parsers for the audit, results, classes and financial aid pages |
| `src/enhancers.js` | Recognises pages, inserts summary cards, saves snapshots |
| `src/overview.js` | Overview dashboard on the homepage |
| `src/shell.js` | Sidebar, palette (search, `:` commands, theme picker), cheat sheet |
| `src/themes.js` | Theme registry; generates one CSS rule per theme |
| `src/keys.js` | Vim-style key table, resolver and actions |
| `src/wizard.js` | One-click Overview setup |
| `src/theme.css` | Restyle and component styles, all scoped to `html.edr-on` |

The parsers read page text rather than PeopleSoft markup, so small layout changes usually don't break them. If NUS changes a page's wording, update the matching parser and its test.

## Background

`docs/research` has the crawl inventory, comparable designs and the design critique (10/40) that motivated this. `docs/prototype` has the Claude Design prototype source, with invented data.

## Robustness

- Does nothing on sign-in, sign-out and session-expired pages.
- Survives an extension reload in already-open tabs (old scripts go quiet instead of throwing).
- Each summary card and parser runs in isolation; one failure can't blank the rest.
- A setup run left behind by a closed tab or expired session is dropped after 10 minutes.
- Hides itself when printing; respects reduced motion and Windows high-contrast mode.

## Limitations

- Only tested against the EduRec layout as of October 2026.
- The Overview only knows what you've opened since installing. There is no background syncing, by design.
- Exam schedule, transcripts and the rest keep EduRec's own layout, inside the new shell.
