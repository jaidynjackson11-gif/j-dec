# J-Dec — Shop Floor Demo

> **All data in this repository is fictional.** Part numbers, document numbers,
> assembly steps, torque references, department names, station names, employees
> and storage locations are invented for this prototype. Nothing here describes
> any real company, product, or manufacturing process.

WorkDay-style shop-floor demo for tablets. Plain HTML/CSS/JS — no build step,
runs as-is on GitHub Pages. White theme, #0072CE accent, SVG line icons.

## Sign-in

Client-side access code (demo lock, not real security). Pick who is signing in:

- **Supervisor** — management access (all apps)
- **Station Tablet** — standard access

## Apps

| App | Access | What it does |
|---|---|---|
| Digital SWI | All | SWI picker (dept/area filters + search) with the live Demo Arms walkthrough; other SWIs are obvious fillers |
| Trainer | All | Walkthrough with 3D-render placeholders + chronological build quiz (100% to pass) |
| Stations | All (edit: mgmt) | Station lookup — ID, tasks, trained employees; management can add/edit stations |
| Part Library | All | Search Demo Arms parts by name/number — photo, description, storage, steps used |
| OFI Submit | All | Submit improvement ideas tagged to dept/area/station |
| Injury Report | All | Incident form (department dropdown); submissions visible only to management |
| Training | Management | Search employees, view training grouped Dept → Station → Task, add training with dual sign-off, remove with logged reason |
| People | Management | Employee lookup — details, absences, submitted OFIs (tap to read), change history |
| Reinforcement | Management | Alert supervisors with trained employees, by station ID or whole department |
| Alerts | Management | Inbox of reinforcement requests, unread badge on the home tile |
| OFI Review | Management | Filter submitted OFIs by dept/area/station, update status; oil-nozzle OFI includes a full savings worksheet |
| Submitted Injury Reports | Management | All injury reports with submission timestamps |

Naming: every department, area and station name in this demo is fictional filler
stations, Demo Arms). Everything else is an obvious filler like `abc123` /
`abcde SWI` so it can't be mistaken for a real station.

All data is demo data stored in the browser's `localStorage` — nothing leaves
the device. Reset from Profile → "Reset demo data".

## Files

- `data.js` — org structure (departments → areas → stations → tasks, station IDs),
  demo employees, SWI catalog, seeded OFIs
- `station-data.json` — fictional Demo Arms walkthrough content (SWI DEMO-0001/0002)
- `part-photos/` — drop part photos here, filenames matching `photoFilename`
  in station-data.json (placeholders show until then)
- `logo.png` — header/sign-in logo

## Running locally

```
npx http-server . -p 8080
```
