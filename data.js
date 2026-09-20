/* J-Dec demo data — INTENTIONALLY EMPTY.

   This file ships with no content. There are no departments, areas, stations,
   tasks, employees, work instructions, improvement ideas, injury reports or
   alerts in this project. Every screen renders its empty state.

   The app is a user-interface prototype, published to show how the screens
   look and how they fit together, not to carry data of any kind. Nothing here
   describes any real product, process, employer or workplace. */
"use strict";

/* ============================================================
   Facility org structure — Department -> Areas -> Stations -> Tasks
============================================================ */
const ORG = [];

/* ============================================================
   Sign-in profiles (who is signed in on this tablet)
============================================================ */
const USERS = [
  { id: "supervisor", label: "Management profile", role: "management", empNum: null },
  { id: "tablet",     label: "Station tablet",     role: "standard",   empNum: null },
];

/* ============================================================
   Employees
============================================================ */
const SEED_EMPLOYEES = [];

/* helper kept so training entries could be added later */
function t(dept, area, station, task, date) {
  return { dept, area, station, task, date, time: "", signedManager: "", signedEmployee: "" };
}

/* ============================================================
   Work instruction catalog
============================================================ */
const SWI_CATALOG = [];

/* ============================================================
   Improvement ideas (OFIs)
============================================================ */
const SEED_OFIS = [];

/* ============================================================
   Injury reports
============================================================ */
const SEED_INJURIES = [];

/* ============================================================
   Reinforcement alerts
============================================================ */
const SEED_ALERTS_STORE = [];
