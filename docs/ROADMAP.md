# Feature ideas

Ranked roughly by value to a student against effort. None are built yet.

| Idea | Why | Notes |
|---|---|---|
| GPA what-if / S/U planner | The most-asked question after results release | Uses saved results; pure maths, no new scraping |
| Exam schedule card + countdown | "When and where is my next exam?" | New parser for View Exam Schedule; same pattern as results |
| Export exams to calendar (.ics) | One click into Google/Apple Calendar | Download generated locally from parsed data |
| Recent pages in search | Faster return to what you just used | Keep the last ~8 visited tiles in storage |
| Pin pages to the sidebar | Personal shortcuts | Drag or `:pin` from search |
| Degree planner | See which courses close each open requirement | Builds on the audit parser; needs course lists |
| Density and font-size settings | Accessibility and preference | Two tokens (`--edr-space`, `--edr-font-size`) |
| Auto theme (follow the OS) | Dark at night without thinking | `prefers-color-scheme` picks a light and a dark theme |
| Data export (JSON) | Keep your own record | From the popup |
| Custom theme editor | Make your own palette | Reuse the token list and the contrast test live |
