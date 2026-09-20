/* J-Dec demo data: org structure, employees, SWI catalog, seed OFIs/injuries/alerts.

   EVERYTHING IN THIS FILE IS FICTIONAL. The departments, areas, stations,
   tasks, people, improvement ideas, reports and alerts are invented to
   exercise the interface. Names like "abc123" are obvious fillers; the
   named ones are no more real than the fillers. Nothing here describes any
   real product, process, employer or workplace. */
"use strict";

/* ============================================================
   Facility org structure
   Department -> Areas -> Stations (unique station IDs) -> Tasks
============================================================ */
const ORG = [
  {
    dept: "Assembly",
    areas: [
      {
        area: "Line A",
        stations: [
          { id: "ST-101", name: "Drives", tasks: ["abc123", "def456"] },
          { id: "ST-102", name: "Base", tasks: ["ghi789", "jkl012"] },
          { id: "ST-103", name: "Frame", tasks: ["mno345", "pqr678"] },
          { id: "ST-104", name: "Cushion",  tasks: ["stu901", "vwx234"] },
        ],
      },
      {
        area: "Line B",
        stations: [
          { id: "ST-105", name: "abc123", tasks: ["aa11", "bb22"] },
          { id: "ST-106", name: "def456", tasks: ["cc33", "dd44"] },
        ],
      },
      {
        // Both demo lines converge on these shared stations.
        area: "Shared (Line A & Line B)",
        stations: [
          { id: "ST-107", name: "Leak Test", tasks: ["ee55", "ff66"] },
          { id: "ST-108", name: "Inspection", tasks: ["gg77", "hh88"] },
          { id: "ST-109", name: "Packaging",  tasks: ["ii99", "jj00"] },
        ],
      },
      {
        area: "Subs",
        stations: [
          {
            id: "ST-110",
            name: "Demo Cell",
            tasks: ["Body Prep", "Seal Install", "Cartridge Install", "Plate & Adapter", "Leak & Function Test", "Cover & Tag"],
          },
          { id: "ST-111", name: "ghi789", tasks: ["kk12", "ll34"] },
          { id: "ST-112", name: "jkl012", tasks: ["mm56", "nn78"] },
        ],
      },
      {
        area: "Module",
        stations: [
          { id: "ST-113", name: "mno345", tasks: ["oo90", "pp13"] },
        ],
      },
      {
        area: "Packaging",
        stations: [
          { id: "ST-114", name: "pqr678", tasks: ["qq24", "rr35"] },
        ],
      },
    ],
  },
  {
    dept: "Kitting",
    areas: [
      {
        area: "abc111",
        stations: [
          { id: "ST-201", name: "kt101", tasks: ["ss46", "tt57"] },
          { id: "ST-202", name: "kt202", tasks: ["uu68", "vv79"] },
        ],
      },
    ],
  },
  {
    dept: "Series 300",
    areas: [
      {
        area: "def222",
        stations: [
          { id: "ST-301", name: "ds101", tasks: ["ww80", "xx91"] },
        ],
      },
    ],
  },
  {
    dept: "Machining",
    areas: [
      {
        area: "ghi333",
        stations: [
          { id: "ST-401", name: "mc101", tasks: ["yy02", "zz13"] },
          { id: "ST-402", name: "mc202", tasks: ["ab24", "cd35"] },
        ],
      },
    ],
  },
  {
    dept: "Enclosures",
    areas: [
      {
        area: "jkl444",
        stations: [
          { id: "ST-501", name: "cf101", tasks: ["ef46", "gh57"] },
        ],
      },
    ],
  },
  {
    dept: "Sewing",
    areas: [
      {
        area: "mno555",
        stations: [
          { id: "ST-601", name: "sw101", tasks: ["ij68", "kl79"] },
        ],
      },
    ],
  },
];

/* ============================================================
   Demo users (who is signed in on this tablet)
============================================================ */
const USERS = [
  { id: "supervisor", label: "Jaidyn Jackson — Supervisor", role: "management", empNum: "100001" },
  { id: "tablet",     label: "Station Tablet — Standard",   role: "standard",   empNum: null },
];

/* ============================================================
   Demo employees (all fictional except names/dates you chose)
============================================================ */
const SEED_EMPLOYEES = [
  {
    num: "100001",
    name: "Jaidyn Jackson",
    birthday: "Mar 4",
    hireDate: "2026-06-29",
    department: "Assembly",
    supervisor: "M. Alvarez",
    absences: [],
    training: [
      t("Assembly", "Subs", "Demo Cell", "Body Prep", "2026-06-30"),
      t("Assembly", "Subs", "Demo Cell", "Seal Install", "2026-07-01"),
      t("Assembly", "Subs", "Demo Cell", "Cartridge Install", "2026-07-02"),
      t("Assembly", "Subs", "Demo Cell", "Plate & Adapter", "2026-07-06"),
      t("Assembly", "Subs", "Demo Cell", "Leak & Function Test", "2026-07-07"),
      t("Assembly", "Subs", "Demo Cell", "Cover & Tag", "2026-07-08"),
    ],
    changeLog: [],
  },
  {
    num: "100112",
    name: "Thomas Reed",
    birthday: "Sep 2",
    hireDate: "2018-03-05",
    department: "Assembly",
    supervisor: "M. Alvarez",
    absences: [
      { date: "2025-11-18", type: "Vacation" },
      { date: "2026-01-06", type: "Sick" },
    ],
    training: [
      t("Assembly", "Subs", "Demo Cell", "Body Prep", "2018-04-10"),
      t("Assembly", "Subs", "Demo Cell", "Plate & Adapter", "2018-05-02"),
      t("Assembly", "Subs", "Demo Cell", "Leak & Function Test", "2018-05-20"),
      t("Assembly", "Line A", "Drives", "abc123", "2021-09-30"),
      t("Kitting", "abc111", "kt101", "ss46", "2023-06-08"),
    ],
    changeLog: [],
  },
  {
    num: "100487",
    name: "Sarah Thomason",
    birthday: "Jul 27",
    hireDate: "2022-10-11",
    department: "Assembly",
    supervisor: "K. Osei",
    absences: [
      { date: "2026-03-30", type: "Personal" },
    ],
    training: [
      t("Assembly", "Line A", "Base", "ghi789", "2022-11-01"),
      t("Assembly", "Line A", "Base", "jkl012", "2022-11-15"),
      t("Assembly", "Line A", "Frame", "mno345", "2024-04-18"),
      t("Assembly", "Shared (Line A & Line B)", "Leak Test", "ee55", "2025-08-22"),
    ],
    changeLog: [],
  },
  {
    num: "100305",
    name: "Alex Rivera",
    birthday: "Jan 19",
    hireDate: "2020-07-20",
    department: "Assembly",
    supervisor: "M. Alvarez",
    absences: [],
    training: [
      t("Assembly", "Subs", "Demo Cell", "Body Prep", "2020-08-11"),
      t("Assembly", "Subs", "Demo Cell", "Seal Install", "2020-08-25"),
      t("Assembly", "Subs", "Demo Cell", "Plate & Adapter", "2020-09-15"),
      t("Assembly", "Subs", "Demo Cell", "Leak & Function Test", "2021-02-03"),
      t("Assembly", "Module", "mno345", "oo90", "2024-10-09"),
    ],
    changeLog: [],
  },
  {
    num: "100178",
    name: "Bianca Thompson",
    birthday: "May 30",
    hireDate: "2019-01-14",
    department: "Kitting",
    supervisor: "K. Osei",
    absences: [
      { date: "2026-05-12", type: "Sick" },
    ],
    training: [
      t("Kitting", "abc111", "kt101", "ss46", "2019-02-01"),
      t("Kitting", "abc111", "kt101", "tt57", "2019-02-20"),
      t("Kitting", "abc111", "kt202", "uu68", "2019-03-05"),
      t("Assembly", "Packaging", "pqr678", "qq24", "2023-11-28"),
    ],
    changeLog: [],
  },
  {
    num: "100523",
    name: "Chidi Okafor",
    birthday: "Dec 8",
    hireDate: "2023-05-08",
    department: "Assembly",
    supervisor: "M. Alvarez",
    absences: [
      { date: "2026-04-02", type: "Vacation" },
      { date: "2026-04-03", type: "Vacation" },
    ],
    training: [
      t("Assembly", "Line A", "Drives", "abc123", "2023-06-01"),
      t("Assembly", "Line A", "Drives", "def456", "2023-06-22"),
      t("Assembly", "Line A", "Cushion", "stu901", "2024-09-10"),
      t("Assembly", "Subs", "Demo Cell", "Body Prep", "2025-10-03"),
    ],
    changeLog: [],
  },
  {
    num: "100094",
    name: "Dana Nguyen",
    birthday: "Aug 16",
    hireDate: "2015-09-28",
    department: "Machining",
    supervisor: "R. Whitfield",
    absences: [],
    training: [
      t("Machining", "ghi333", "mc101", "yy02", "2015-10-15"),
      t("Machining", "ghi333", "mc101", "zz13", "2015-11-02"),
      t("Machining", "ghi333", "mc202", "ab24", "2017-04-06"),
    ],
    changeLog: [],
  },
  {
    num: "100356",
    name: "Evan Marsh",
    birthday: "Feb 22",
    hireDate: "2021-11-29",
    department: "Assembly",
    supervisor: "K. Osei",
    absences: [
      { date: "2026-06-19", type: "Sick" },
    ],
    training: [
      t("Assembly", "Packaging", "pqr678", "qq24", "2021-12-13"),
      t("Assembly", "Shared (Line A & Line B)", "Packaging", "ii99", "2022-02-07"),
      t("Assembly", "Shared (Line A & Line B)", "Inspection", "gg77", "2024-05-30"),
    ],
    changeLog: [],
  },
];

/* helper to keep entries compact */
function t(dept, area, station, task, date) {
  return {
    dept, area, station, task, date,
    time: "07:30",
    signedManager: "M. Alvarez",
    signedEmployee: "(on file)",
  };
}

/* ============================================================
   SWI catalog — two demo SWIs + obvious fillers ("abcde SWI")
============================================================ */
const SWI_CATALOG = [
  { id: "swi-demo-a", num: "DEMO-0001", title: "Demo Assy, Valve Manifold — Type A (Rev A)", dept: "Assembly", area: "Subs", station: "Demo Cell", real: true },
  { id: "swi-demo-b", num: "DEMO-0002", title: "Demo Assy, Valve Manifold — Type B (Rev A)", dept: "Assembly", area: "Subs", station: "Demo Cell", real: true, variant: "TYPE-B" },
  { id: "swi-f01", num: "00001", title: "abcde SWI", dept: "Assembly", area: "Line A", station: "Drives" },
  { id: "swi-f02", num: "00002", title: "fghij SWI", dept: "Assembly", area: "Line A", station: "Base" },
  { id: "swi-f03", num: "00003", title: "klmno SWI", dept: "Assembly", area: "Line A", station: "Frame" },
  { id: "swi-f04", num: "00004", title: "pqrst SWI", dept: "Assembly", area: "Line A", station: "Cushion" },
  { id: "swi-f05", num: "00005", title: "uvwxy SWI", dept: "Assembly", area: "Shared (Line A & Line B)", station: "Leak Test" },
  { id: "swi-f06", num: "00006", title: "zabcd SWI", dept: "Assembly", area: "Shared (Line A & Line B)", station: "Inspection" },
  { id: "swi-f07", num: "00007", title: "efghi SWI", dept: "Assembly", area: "Subs", station: "ghi789" },
  { id: "swi-f08", num: "00008", title: "jklmn SWI", dept: "Assembly", area: "Module", station: "mno345" },
  { id: "swi-f09", num: "00009", title: "opqrs SWI", dept: "Kitting", area: "abc111", station: "kt101" },
  { id: "swi-f10", num: "00010", title: "tuvwx SWI", dept: "Series 300", area: "def222", station: "ds101" },
  { id: "swi-f11", num: "00011", title: "yzabc SWI", dept: "Machining", area: "ghi333", station: "mc101" },
  { id: "swi-f12", num: "00012", title: "defgh SWI", dept: "Enclosures", area: "jkl444", station: "cf101" },
  { id: "swi-f13", num: "00013", title: "ijklm SWI", dept: "Sewing", area: "mno555", station: "sw101" },
];

/* ============================================================
   Seed OFIs — invented demo submissions, pre-loaded so the app
   has something to show. Neither describes a real workplace.
   The first carries a full savings worksheet to demo the format.
============================================================ */
const SEED_OFIS = [
  {
    id: "ofi-seed-1",
    submitter: "Jaidyn Jackson",
    empNum: "100001",
    dept: "Assembly",
    area: "Subs",
    station: "Demo Cell",
    title: "Self-draining rinse basket for the parts washer",
    description:
      "In this demo scenario the washer basket has no drain slots, so after every wash the assembler tips the basket by hand and waits for it to stop dripping before the castings can be blown dry — an illustrative 12.00 seconds of waiting per unit. Adding drain slots to the basket floor would let it drain on its own while the assembler moves to the next task. Figures below are placeholders for demonstrating the worksheet, not measurements of anything.",
    status: "submitted",
    submittedAt: "2026-07-08T09:42:00",
    worksheet: {
      intro: "Value model — plug in your own production numbers. The only fixed input is the time saving, and in this demo that figure is invented. Every other value is a variable management would fill in from internal data.",
      fixed: "T = 12.00 seconds of operator waiting eliminated per unit (illustrative demo figure, not a real measurement).",
      variables: [
        ["A", "Units produced per day on the line (units/day)"],
        ["B", "Production workdays per year (days/year)"],
        ["C", "Fully burdened labor rate ($/hour — wages + benefits + overhead)"],
        ["D", "Current total assembly labor time per unit (seconds)"],
        ["E", "Average selling price (or contribution margin) per unit ($)"],
        ["F", "Share of freed capacity actually used for added output (0 to 1)"],
      ],
      formulas: [
        ["Daily labor hours saved",
         "H_day = (T × A) ÷ 3,600",
         "Each unit returns T seconds of productive time; multiply by daily volume and convert seconds to hours (3,600 s = 1 h). Assumes the step happens once per unit."],
        ["Annual labor hours saved",
         "H_yr = (T × A × B) ÷ 3,600",
         "Daily savings scaled across the production year."],
        ["Annual labor cost savings",
         "S = H_yr × C",
         "Recovered hours valued at the fully burdened rate. This is redeployed capacity, not headcount reduction — the operator keeps working instead of waiting."],
        ["Process efficiency gain",
         "Efficiency % = (T ÷ D) × 100",
         "The share of the cycle that is pure non-value-added waiting. Removing it is a direct cycle-time reduction with no quality risk."],
        ["Additional annual capacity",
         "N = (T × A × B) ÷ D",
         "If the freed seconds are re-invested in assembly, they add up to whole additional units per year (freed seconds per year divided by the labor seconds in one unit)."],
        ["Optional revenue upside",
         "R = N × E × F",
         "Only counts if the extra capacity is actually needed and sold; F keeps the estimate honest (set F = 0 to exclude it entirely)."],
      ],
      lean: "Lean/CI framing: the 12.00 s is Waiting — one of the classic 8 wastes — and eliminating it is a textbook kaizen: small, cheap, applies to every unit, no quality risk. The same inputs feed standard metrics: cycle-time reduction (T ÷ D), OEE performance uplift, and takt-time headroom (freed time per shift vs. takt). Assumptions: the operator has useful work available during the wait, the step occurs on every unit, and C is the burdened rate rather than base wage.",
    },
  },
  {
    id: "ofi-seed-2",
    submitter: "Jaidyn Jackson",
    empNum: "100001",
    dept: "Assembly",
    area: "Subs",
    station: "Demo Cell",
    title: "Shadow board for the demo cell hand tools",
    description:
      "In this demo scenario the deburr tool, plastic pick and depth gauge live loose in a drawer, so each one gets hunted for at the start of a build and is easy to leave behind at the test bench. A shadow board above the prep mat would give all three a marked home, make a missing tool obvious at a glance, and remove the hunting time from the front of every build. Invented example, used here to show what a second submission looks like in the list.",
    status: "submitted",
    submittedAt: "2026-07-08T09:55:00",
  },
];

/* ============================================================
   Seed injury report (visible in Submitted Injury Reports)
============================================================ */
const SEED_INJURIES = [
  {
    name: "Evan Marsh",
    what: "Caught the back of my hand on a burr while unloading the washer basket. Cleaned and covered it at the first aid station and finished the shift; reporting it so the basket gets checked. (Invented demo report.)",
    where: "Assembly",
    when: "2026-07-06T11:20",
    submitted: "2026-07-06T11:34:00",
  },
];

/* ============================================================
   Seed reinforcement alerts.
   status: "live" (open) or "filled" (qty met — history only).
   candidates: employees whose training matches; response is
   null (no answer yet), "available" or "denied" — set by their
   supervisor in the Alerts app. accepted: employee numbers the
   requesting supervisor has taken.
============================================================ */
const SEED_ALERTS_STORE = [
  {
    id: "alert-seed-1",
    title: "Department Assistance: Kitting",
    when: "2026-07-10T06:52:00",
    qty: 2,
    requestedBy: "K. Osei",
    status: "live",
    candidates: [
      { name: "Thomas Reed", num: "100112", stations: ["kt101"], response: null },
      { name: "Bianca Thompson", num: "100178", stations: ["kt101", "kt202"], response: null },
    ],
    accepted: [],
  },
  {
    id: "alert-seed-2",
    title: "Assembly Department Demo Cell",
    when: "2026-07-10T09:15:00",
    qty: 1,
    requestedBy: "M. Alvarez",
    status: "live",
    candidates: [
      { name: "Alex Rivera", num: "100305", stations: ["Demo Cell"], response: null },
    ],
    accepted: [],
  },
  /* history fillers (already filled) */
  {
    id: "alert-hist-1",
    title: "Department Assistance: Machining",
    when: "2026-07-02T13:05:00",
    qty: 1,
    requestedBy: "R. Whitfield",
    status: "filled",
    candidates: [
      { name: "Dana Nguyen", num: "100094", stations: ["mc101", "mc202"], response: "available" },
    ],
    accepted: ["100094"],
  },
  {
    id: "alert-hist-2",
    title: "Station ST-114 — pqr678 (Assembly)",
    when: "2026-06-24T08:40:00",
    qty: 1,
    requestedBy: "M. Alvarez",
    status: "filled",
    candidates: [
      { name: "Evan Marsh", num: "100356", stations: ["pqr678"], response: "available" },
      { name: "Bianca Thompson", num: "100178", stations: ["pqr678"], response: "denied" },
    ],
    accepted: ["100356"],
  },
  {
    id: "alert-hist-3",
    title: "Department Assistance: Sewing",
    when: "2026-06-11T10:12:00",
    qty: 1,
    requestedBy: "K. Osei",
    status: "filled",
    candidates: [
      { name: "Sarah Thomason", num: "100487", stations: ["sw101"], response: "available" },
    ],
    accepted: ["100487"],
  },
];
