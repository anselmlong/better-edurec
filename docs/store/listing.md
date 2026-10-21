# Chrome Web Store submission: Better EduRec

Everything the Developer Dashboard asks for, ready to paste. Upload `dist/better-edurec-<version>.zip` from `npm run pack`.

## Visibility

**Unlisted.** Only people with the link can install it. Switch to Public later from the Distribution tab.

## Store listing

**Name** (from the manifest): Better EduRec (unofficial)

**Summary** (from the manifest, 132 characters max):
Unofficial, read-only redesign of NUS EduRec: a clean sidebar, search, live timetable, themes and keyboard controls.

**Category:** Productivity → Education (whichever the dashboard offers; "Education" if listed)

**Language:** English

**Description:**

> Better EduRec is an unofficial, student-made redesign of NUS EduRec. It is not affiliated with or endorsed by the National University of Singapore.
>
> It changes how EduRec looks in your own browser, and nothing else:
>
> • A clean sidebar with every section, plus search (⌘K / Ctrl K) across pages and sub-pages
> • Quick links straight to your unofficial transcript, exam results, exam schedule, course registration and S/U declarations
> • An optional Overview: GPA, degree progress, what class is up next, and this week's timetable with a card per course
> • Open your timetable in NUSMods in one click
> • 12 themes, including Dark, Monokai, Dracula, Nord, Terminal and Girlypop
> • Vim-style keyboard controls (press ? for the list)
> • Classic view switches back to EduRec as NUS ships it, any time
>
> Read-only by design: it never submits forms, registers courses or changes your records. Summaries are kept in your browser only and never uploaded. Always confirm grades, requirements and deadlines in EduRec itself.

**Icon:** `icons/store-icon-128.png`

**Screenshots** (1280×800, made from the test harness with invented data — never use real EduRec screenshots, they contain personal data):
- `docs/store/screenshot-overview.png`
- `docs/store/screenshot-timetable.png`
- `docs/store/screenshot-themes.png`

**Homepage URL:** https://github.com/anselmlong/edurec-reskin

**Support URL:** https://github.com/anselmlong/edurec-reskin/issues

## Privacy practices tab

**Single purpose:**
Restyle the NUS EduRec student portal in the user's browser and summarise the user's own academic information from it, read-only.

**Permission justifications:**

- `storage`: Saves the user's theme and layout settings, and summaries of their own EduRec pages (grades, degree audit, timetable), on the device only.
- Host `https://myedurec.nus.edu.sg/*`: The extension's only job is to restyle EduRec pages; its content scripts run on EduRec and nowhere else.
- Host `https://api.nusmods.com/*`: When the user clicks "Open in NUSMods", fetches public class lists for their course codes so the exported NUSMods timetable link uses the right class numbers.

**Remote code:** No, I am not using remote code. All JavaScript is packaged in the extension.

**Data usage.** The dashboard lists these categories. Tick only **Website content**: the extension reads the text of EduRec pages the user opens (grades, degree audit, timetable) and keeps summaries on the device. It stores no name, student number, email or login details.

| Category | Collected? |
|---|---|
| Personally identifiable information | No |
| Health information | No |
| Financial and payment information | No |
| Authentication information | No |
| Personal communications | No |
| Location | No |
| Web history | No |
| User activity | No |
| Website content | **Yes** (kept on device only) |

**Certify** all three:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

**Privacy policy URL:** https://github.com/anselmlong/edurec-reskin/blob/main/PRIVACY.md
(The repo must be public for this link to work. Alternatively publish `PRIVACY.md` as a GitHub Gist or GitHub Pages page.)

## Before submitting

1. Run `npm run pack` and load `dist/` unzipped once in `chrome://extensions` to check it works.
2. Make the repo public (or host PRIVACY.md somewhere public).
3. Pay the one-time US$5 developer registration at https://chrome.google.com/webstore/devconsole.
4. New item → upload the zip → fill in the fields above → Distribution: **Unlisted** → Submit for review.

## Sharing without the store

Attach the zip to a GitHub release. Install: unzip → `chrome://extensions` → Developer mode on → Load unpacked → pick the folder. Updates are manual: download the new zip, replace the folder, click reload.

## Shipping an update

1. `npm run release` (or `npm run release -- minor`). It bumps the version in `manifest.json` and `package.json`, runs checks and tests, builds `dist/better-edurec-<version>.zip`, commits and tags. Add `-- --push` to push and attach the zip to a GitHub release for people who install unpacked.
2. Developer Dashboard → Better EduRec → Package → Upload new package → the new zip.
3. Update the listing or privacy answers only if something visible or a permission changed. New permissions disable the extension for users until they accept them.
4. Submit for review. The current version stays live meanwhile; approved updates reach users automatically within hours.
