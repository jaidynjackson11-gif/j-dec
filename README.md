# J-Dec — Shop Floor Demo

> **This project ships with no data.** There are no departments, areas,
> stations, tasks, employees, work instructions, part numbers, assembly steps,
> torque references, improvement ideas, injury reports or alerts in it. Every
> screen renders its empty state.
>
> J-Dec is a user-interface prototype. It is published to show how the screens
> look and how they fit together, not to carry data of any kind. Nothing here
> describes any real company, product, process, employer or workplace.

WorkDay-style shop-floor UI demo for tablets. Plain HTML/CSS/JS — no build step,
runs as-is on GitHub Pages. White theme, #0072CE accent, SVG line icons.

## Sign-in

Client-side access code (demo lock, not real security). Pick a profile:

- **Management profile** — management access (all apps)
- **Station tablet** — standard access

## Apps

Twelve screens, each rendering its empty state until content is supplied.

| App | Access | What the screen does |
|---|---|---|
| Digital SWI | All | Work-instruction picker with department/area filters and search |
| Trainer | All | Step-by-step station walkthrough plus a chronological build quiz |
| Stations | All (edit: mgmt) | Station lookup — ID, tasks, trained employees; management can add and edit |
| Part Library | All | Part search by name or number — photo, description, storage, steps used |
| OFI Submit | All | Submit improvement ideas tagged to department/area/station |
| Injury Report | All | Incident form; submissions visible only to management |
| Training | Management | Employee training grouped Dept → Station → Task, dual sign-off, logged removals |
| People | Management | Employee lookup — details, absences, submitted OFIs, change history |
| Reinforcement | Management | Request trained help by station or department |
| Alerts | Management | Inbox of reinforcement requests, unread badge on the home tile |
| OFI Review | Management | Filter submitted OFIs, update status |
| Submitted Injury Reports | Management | All injury reports with submission timestamps |

Anything entered while using the demo is stored in the browser's `localStorage`
and never leaves the device. Clear it from Profile → "Reset demo data".

## Files

- `data.js` — org structure, employees, work-instruction catalog, seed records.
  **Ships empty.**
- `station-data.json` — station walkthrough content. **Ships empty**: no parts,
  no steps, no documents.
- `part-photos/` — empty; part photos would go here if content were ever added
- `logo.png` — header and sign-in logo

## Running locally

```
npx http-server . -p 8080
```
