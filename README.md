# RETHREAD

A web app for local secondhand clothing stores. Users browse clothes, save favorites, try items on virtually (simulated demo), and book a time to try them on in the store.

- **Emerging tech:** AI/AR virtual try-on. It does not have to be implemented, but it has to be researched, documented, and shown on the site.
- **Sustainability:** buying secondhand keeps clothes in use and out of landfill. This needs to be visible on the site, not just in the report.

The pages are plain HTML, CSS and JavaScript, backed by a small PHP API that keeps its data in SQLite.

Created for SCU CSEN 163.

## Requirements

This project requires PHP 8.1 or newer. 

You can check your PHP version by running `php -v`.

To install PHP on a Mac, run `brew install php`. On Windows, use the installer from [windows.php.net](https://windows.php.net/download/) or XAMPP.

## Running the Web App

From the project folder:

```bash
php -S localhost:8000 router.php
```

The site is at <http://localhost:8000> and the demo console is at <http://localhost:8000/demo/>. 

The database builds itself on the first request, using the sample stores, pieces, and bookings in `data/`.

## Running the Demo Console

`demo/` is a plain test page for API demonstrations. 

The following demo stores come pre-installed when using the demo console with the default database.

| Store | Auth code |
|-------|-----------|
| Second Story Vintage | `SecondStory-demo-2026` |
| Juniper & Thread | `JuniperThread-demo-2026` |
| North Loop Archive | `NorthLoop-demo-2026` |


## Docs

- [docs/api.md](docs/api.md): REST API documenteion
- [docs/backend.md](docs/backend.md): Configuration, testing, and development documentation on the PHP backend

## Credits
Jess (design), Boyang (HTML/CSS), Andrew (JavaScript), Ismael (AI/AR research) and Charlie (PHP API).

---

# Assignment Info
## Assignment 3: Heuristic evaluation and improved prototype

**Due Thu Nov 19, 2026 at 10:00am on Camino.** Worth 10% of the course grade.

| Part | What | Who | Points |
|---|---|---|---|
| A | Individual heuristic evaluation of our prototype against Nielsen's 10 heuristics, covering every feature. Table: ID, description, heuristic(s), severity, solution. Include good examples as well as violations. | Each person, separately | 50 |
| B | Consolidated issue list (ID, combined name, heuristic(s), evaluator IDs), severity ratings, and UARs | Group | 50 |
| C | Improved prototype | Group | +5 bonus |

**Submission:** one document (PDF or DOCX) with Parts A and B, plus a zip of the improved prototype.

Part A can't start until there is a prototype to evaluate, so the prototype deadline is the one that matters most.

## Roles

| Person | Area |
|---|---|
| Jess | Design (storyboard, lo-fi, look and feel) |
| Boyang | HTML/CSS |
| Andrew | JavaScript |
| Charlie | Data/API (PHP) |
| Ismael | Emerging tech research (AI/AR try-on) |

Everyone leads the technical detail for their own area. Nobody waits to be told what to build.

## Internal deadlines

All deadlines are end of day (11:59pm) unless a time is given.

### Phase 1: Build the prototype (Nov 9 to Nov 14)

| Due | Who | Deliverable |
|---|---|---|
| Tue Nov 10 | Everyone | Final yes/no on the topic in the group chat |
| Tue Nov 10 | Jess | Storyboard / lo-fi for all 5 interactions and the main user flow, including where each piece lives on the page (try-on panel, booking form, any chat box) |
| Tue Nov 10 | Charlie + Andrew | Agree on the data shape for items, stores, and appointments |
| Thu Nov 12 | Boyang | HTML/CSS for every page: browse, favorites, try-on, booking, appointments, tech/sustainability page |
| Thu Nov 12 | Charlie | Sample data (about 20 items, 2 to 3 stores) served as JSON, plus endpoints for items and appointments |
| Thu Nov 12 | Ismael | Research summary on AI/AR try-on, and the sample person and clothing images for the simulated demo |
| Fri Nov 13 | Jess | Hi-fi pass: colors, type, icons, empty and error states |
| Sat Nov 14 | Andrew | All 5 interactions working in JS (see list below) |
| Sat Nov 14 | Ismael | Tech page on the site: how virtual try-on works, what our demo simulates, sustainability angle |
| **Sat Nov 14, 8pm** | **Everyone** | **Prototype v1 frozen.** No changes until Part A is done, so we all evaluate the same thing. |

### Phase 2: Part A, individual evaluation (Nov 15 to Nov 16)

| Due | Who | Deliverable |
|---|---|---|
| Mon Nov 16 | Each person | Own heuristic evaluation table in the shared doc. Do it alone; don't read anyone else's first. |

- Number your findings with your name as a prefix: `jess-HE-01`, `boyang-HE-01`, `andrew-HE-01`, `charlie-HE-01`, `ismael-HE-01`.
- Cover all 5 interactions and every page.
- Severity scale: 0 not a problem, 1 cosmetic, 2 minor, 3 major, 4 catastrophe.
- Violations need a severity and a solution. Good examples only need the description and heuristic.

### Phase 3: Part B, group evaluation (Nov 17)

| Due | Who | Deliverable |
|---|---|---|
| Tue Nov 17, afternoon | Charlie | First pass at merging duplicates into the consolidated table before the meeting |
| Tue Nov 17, evening | Everyone | Group meeting: finalize the consolidated list, agree on severity ratings, split up the UARs |
| Tue Nov 17 | Each person | UARs for the issues in their own area written up |

### Phase 4: Part C and submission (Nov 18)

| Due | Who | Deliverable |
|---|---|---|
| Wed Nov 18, 3pm | Boyang, Andrew, Jess | Fixes for the highest-severity issues (3s and 4s first) in the prototype |
| Wed Nov 18, 6pm | Charlie | Single document assembled: all five Part A tables, then Part B |
| Wed Nov 18, 6pm | Ismael | Short before/after list of what changed in the prototype and which issue each change addresses; improved prototype zipped |
| Wed Nov 18, 8pm | Everyone | Read through the document and test the zip |
| **Wed Nov 18, 9pm** | **Jess** | **Submit on Camino.** Thursday morning is buffer only. |

## The 5 interactions (Boyang's proposal)

1. **Filter clothes.** Filter by size, category, and price. The list updates and shows the number of results. If nothing matches, users can clear the filters.
2. **Save favorites.** Clicking the heart changes it to show the item is saved, and the item appears on the Favorites page. Clicking again removes it.
3. **Simulated virtual try-on.** Pick a sample person and a clothing item, see a simulated result, switch items and compare. Clearly labeled as a demo.
4. **Book an in-store try-on.** Pick a date and time. Missing required information shows a helpful message.
5. **Manage appointments.** After booking, a confirmation shows the item, store, date, and time. Users can view or cancel.

**Main flow:** find clothes → save favorites → try on virtually → book an in-store visit → view or cancel the appointment.

These may change after user research.

## Notes from the instructor

- It has to be a web application, not a static page: pages update on the fly.
- A heavy backend isn't needed. A simple API that feeds the site is enough.
- The presentation has to demo the app working and show what triggers what. Where something isn't really implemented, JavaScript can simulate the procedure. We may need to film the demo.
- Common bottleneck: teams get tunnel vision on implementation and lose sight of the interaction. Keep the interaction visible, for example by showing where a chat box would sit even before it works.
- Have the storyboard / lo-fi ready and be able to simulate how it works.

## Final project deliverables (for later)

- Documentation, 50%: motivation, needs, solutions, design process, lo-fi and hi-fi prototypes, implementation, UI, UX, heuristic evaluation, user study design, discussion and future work. One PDF.
- Final website and source code, 30%
- Final presentation and demo, 10%
- Midterm interview, 10%

Keep the lo-fi sketches, the v1 prototype, and the Assignment 3 tables. They all go into the final documentation.