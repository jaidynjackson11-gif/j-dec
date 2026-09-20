/* J-Dec — WorkDay-style shop floor demo. Client-side only.
   All persistent state lives in localStorage under jdec2-* keys. */
"use strict";

/* ============================================================
   Constants / storage
============================================================ */
const GATE_PASSWORD = "JaidynJackson";
const LS = {
  emps: "jdec2-emps",
  ofis: "jdec2-ofis",
  injuries: "jdec2-injuries",
  alerts: "jdec2-alerts",
  inbox: "jdec2-inbox",
  org: "jdec2-org",
  seeded: "jdec2-seeded",
};

function loadLS(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function saveLS(key, v) { localStorage.setItem(key, JSON.stringify(v)); }

/* one-time seed (version-bumped so redeploys refresh stale demo data) */
const SEED_VERSION = "5";
function seedAll() {
  saveLS(LS.emps, SEED_EMPLOYEES);
  saveLS(LS.ofis, SEED_OFIS);
  saveLS(LS.injuries, SEED_INJURIES);
  saveLS(LS.inbox, SEED_ALERTS_STORE);
  saveLS(LS.org, ORG);
  localStorage.removeItem(LS.alerts);
  localStorage.setItem(LS.seeded, SEED_VERSION);
}
if (localStorage.getItem(LS.seeded) !== SEED_VERSION) seedAll();

function getEmps() { return loadLS(LS.emps, SEED_EMPLOYEES); }
function getOfis() { return loadLS(LS.ofis, SEED_OFIS); }
function getOrg()  { return loadLS(LS.org, ORG); }
function getAlertsStore() { return loadLS(LS.inbox, SEED_ALERTS_STORE); }
function saveAlertsStore(v) { saveLS(LS.inbox, v); }
/* alerts still needing this supervisor's attention: live, and at least
   one candidate not denied */
function inboxAlerts() {
  return getAlertsStore().filter(a =>
    a.status === "live" && a.candidates.some(c => c.response !== "denied"));
}
function allStations() {
  const out = [];
  getOrg().forEach(d => d.areas.forEach(a => a.stations.forEach(s =>
    out.push({ dept: d.dept, area: a.area, id: s.id, name: s.name, tasks: s.tasks }))));
  return out;
}

function resetDemoData() {
  Object.values(LS).forEach(k => localStorage.removeItem(k));
  seedAll();
}

/* ============================================================
   Helpers
============================================================ */
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function icon(name, cls = "ic") { return `<svg class="${cls}"><use href="#${name}"/></svg>`; }
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}
function fmtDateTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    + " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
/* "Submitted 10/26/24 at 10:34am" style stamp */
function fmtStamp(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  const date = d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "2-digit" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(" ", "").toLowerCase();
  return `${date} at ${time}`;
}

/* savings worksheet, rendered as plain typed text — an employee submitting an
   OFI can't style headings, so neither does this */
function worksheetHTML(w) {
  if (!w) return "";
  const lines = [
    "",
    "SAVINGS MODEL (plug in your own numbers)",
    w.intro,
    "",
    "Fixed input: " + w.fixed,
    "",
    "Variable key:",
    ...w.variables.map(v => v[0] + " = " + v[1]),
    "",
    "Formulas:",
    ...w.formulas.map(f => "- " + f[0] + ":  " + f[1] + ".  " + f[2]),
    "",
    "Lean/CI notes and assumptions: " + w.lean,
  ];
  return `<p style="white-space:pre-line;line-height:1.55;margin-top:.6rem">${esc(lines.join("\n"))}</p>`;
}
const AVATAR = `<span class="emp-avatar"><svg viewBox="0 0 24 24"><use href="#i-avatar"/></svg></span>`;

/* current signed-in user */
let currentUser = null;
try { currentUser = JSON.parse(sessionStorage.getItem("jdec2-user")); } catch {}
const isMgmt = () => currentUser && currentUser.role === "management";

/* ============================================================
   Sign-in gate
============================================================ */
const gateEl = document.getElementById("gate");
const appEl = document.getElementById("app");
const gateUserSel = document.getElementById("gateUser");
gateUserSel.innerHTML = USERS.map(u => `<option value="${u.id}">${esc(u.label)}</option>`).join("");

function tryUnlock() {
  const input = document.getElementById("gateInput");
  if (input.value === GATE_PASSWORD) {
    currentUser = USERS.find(u => u.id === gateUserSel.value) || USERS[0];
    sessionStorage.setItem("jdec2-user", JSON.stringify(currentUser));
    enterApp();
  } else {
    document.getElementById("gateError").hidden = false;
    input.value = "";
    input.focus();
  }
}
document.getElementById("gateBtn").addEventListener("click", tryUnlock);
document.getElementById("gateInput").addEventListener("keydown", e => { if (e.key === "Enter") tryUnlock(); });

function enterApp() {
  gateEl.hidden = true;
  appEl.hidden = false;
  if (!location.hash || location.hash === "#") location.hash = "#home";
  render();
}
function signOut() {
  sessionStorage.removeItem("jdec2-user");
  currentUser = null;
  appEl.hidden = true;
  gateEl.hidden = false;
  document.getElementById("gateInput").value = "";
  document.getElementById("gateError").hidden = true;
  location.hash = "#home";
}
/* ============================================================
   App registry (home grid)
============================================================ */
const APPS = [
  { route: "swi",       label: "Digital SWI",  icon: "i-clipboard" },
  { route: "trainer",    label: "Trainer",       icon: "i-cap" },
  { route: "stations",   label: "Stations",      icon: "i-pin" },
  { route: "parts",      label: "Part Library",  icon: "i-box" },
  { route: "ofi-submit", label: "OFI Submit",    icon: "i-bulb" },
  { route: "injury",     label: "Injury Report", icon: "i-aid" },
  { route: "training",   label: "Training",      icon: "i-badge",     mgmt: true },
  { route: "employees",  label: "People",        icon: "i-people",    mgmt: true },
  { route: "reinforce",  label: "Reinforcement", icon: "i-megaphone", mgmt: true },
  { route: "alerts",     label: "Alerts",        icon: "i-bell",      mgmt: true,
    badge: () => inboxAlerts().length },
  { route: "ofi-review", label: "OFI Review",    icon: "i-review",    mgmt: true },
  { route: "injuries-review", label: "Submitted Injury Reports", icon: "i-doc", mgmt: true },
];

/* ============================================================
   Router
============================================================ */
const viewEl = document.getElementById("view");

window.addEventListener("hashchange", render);
document.getElementById("bottomNav").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  location.hash = "#" + btn.dataset.nav;
});

function go(route) { location.hash = "#" + route; }

function render() {
  if (!currentUser) return;
  const hash = (location.hash || "#home").slice(1);
  const [route, arg, arg2] = hash.split("/");

  document.querySelectorAll("#bottomNav button").forEach(b => {
    b.classList.toggle("active", b.dataset.nav === route);
  });
  window.scrollTo({ top: 0 });

  const mgmtRoutes = ["training", "employees", "reinforce", "ofi-review", "emp", "alerts", "injuries-review"];
  if (mgmtRoutes.includes(route) && !isMgmt()) return renderRestricted();

  switch (route) {
    case "home":       return renderHome();
    case "profile":    return renderProfile();
    case "training":   return renderEmpSearch("Training", "Search for an employee to view or update their completed training.");
    case "employees":  return renderEmpSearch("People", "Look up an employee's details and submitted OFIs.");
    case "emp":
      if (arg2 === "add") return renderAddTraining(arg);
      return renderEmployee(arg);
    case "reinforce":
      if (arg === "create") return renderReinforceCreate();
      if (arg === "live" && arg2) return renderReinforceLiveDetail(arg2);
      if (arg === "live") return renderReinforceLive();
      if (arg === "history") return renderReinforceHistory();
      return renderReinforceHome();
    case "alerts":     return renderAlerts();
    case "injuries-review": return renderInjuriesReview();
    case "stations":
      if (arg) return renderStationPage(decodeURIComponent(arg));
      return renderStations();
    case "trainer":
      if (arg === "walk" && arg2) return renderTrainerWalk(decodeURIComponent(arg2));
      if (arg === "walk") return renderTrainerWalkPicker();
      if (arg === "quiz") return renderTrainerQuiz();
      return renderTrainerHome();
    case "swi":
      if (arg) return renderSwiViewer(arg);
      return renderSwiPicker();
    case "ofi-submit": return renderOfiSubmit();
    case "ofi-review": return renderOfiReview();
    case "parts":      return renderPartLibrary();
    case "injury":     return renderInjury();
    default:           return renderHome();
  }
}

function topbar(title, backTo) {
  return `<div class="topbar">
    <button class="back" data-back="${esc(backTo || "home")}" aria-label="Back">${icon("i-back")}</button>
    <div class="title">${esc(title)}</div><div></div>
  </div>`;
}
viewEl.addEventListener("click", e => {
  const b = e.target.closest("[data-back]");
  if (b) go(b.dataset.back);
});

function renderRestricted() {
  viewEl.innerHTML = topbar("Restricted") + `
    <div class="page-pad"></div>
    <div class="restricted">${icon("i-lock")} This app requires management access.
      Sign in with a management profile to continue.</div>`;
}

/* ============================================================
   Home — WorkDay-style app grid
============================================================ */
function renderHome() {
  const apps = APPS.filter(a => !a.mgmt || isMgmt());
  viewEl.innerHTML = `
    <div class="logo-head"><img src="logo-light.png" alt="J-Dec" onerror="this.style.display='none'"></div>
    <div class="home-hello">
      <h1>Hi There</h1>
      <p class="muted">${esc(currentUser.label)}</p>
    </div>
    <div class="section-head"><h2>Apps</h2></div>
    <div class="app-grid">
      ${apps.map(a => {
        const n = a.badge ? a.badge() : 0;
        return `
        <button class="app-tile" data-app="${a.route}">
          <span class="app-icon">${icon(a.icon)}${n ? `<span class="badge">${n}</span>` : ""}</span>
          <span>${esc(a.label)}</span>
          ${a.mgmt ? `<span class="tag">MANAGEMENT</span>` : ""}
        </button>`;
      }).join("")}
    </div>`;
  viewEl.querySelectorAll("[data-app]").forEach(b =>
    b.addEventListener("click", () => go(b.dataset.app)));
}

/* ============================================================
   Profile
============================================================ */
function renderProfile() {
  viewEl.innerHTML = topbar("Profile") + `
    <div class="page-pad"></div>
    <div class="card">
      <div class="emp-head">${AVATAR}
        <div>
          <div class="emp-name">${esc(currentUser.label.split(" — ")[0])}</div>
          <div class="emp-num">${esc(currentUser.role === "management" ? "Management access" : "Standard access")}</div>
        </div>
      </div>
    </div>
    <div class="card">
      <button id="signOutBtn" class="btn block">${icon("i-logout")} Sign Out</button>
      <hr class="divider">
      <button id="resetBtn" class="btn danger block">${icon("i-trash")} Reset demo data</button>
      <p class="muted small" style="margin-top:.8rem">Resets employees, training, OFIs, injury reports
        and alerts on this device back to the demo defaults.</p>
    </div>`;
  document.getElementById("signOutBtn").addEventListener("click", signOut);
  document.getElementById("resetBtn").addEventListener("click", () => {
    resetDemoData();
    toast("Demo data reset");
    render();
  });
}

/* ============================================================
   Employee search (Training / Employees / Find)
============================================================ */
function renderEmpSearch(title, blurb) {
  viewEl.innerHTML = topbar(title) + `
    <p class="muted" style="padding:1rem 1.4rem 0">${esc(blurb)}</p>
    <div class="search-box">${icon("i-search")}
      <input type="search" id="empQ" placeholder="Search by name or employee number" autocomplete="off">
    </div>
    <div id="empResults"></div>`;
  const input = document.getElementById("empQ");
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const emps = getEmps().filter(e =>
      !q || e.name.toLowerCase().includes(q) || e.num.includes(q));
    document.getElementById("empResults").innerHTML = emps.length
      ? emps.map(e => `
        <button class="list-row" data-emp="${e.num}">
          ${AVATAR.replace('class="emp-avatar"', 'class="emp-avatar" style="width:52px;height:52px"')}
          <span class="grow">
            <b>${esc(e.name)}</b><br>
            <span class="muted small">#${e.num} · ${esc(e.department)}</span>
          </span>
          <span class="chev">${icon("i-chev")}</span>
        </button>`).join("")
      : `<div class="empty-note">No employees match "${esc(input.value)}".</div>`;
    document.querySelectorAll("[data-emp]").forEach(b =>
      b.addEventListener("click", () => go("emp/" + b.dataset.emp)));
  };
  input.addEventListener("input", draw);
  draw();
}

/* ============================================================
   Employee page
============================================================ */
function renderEmployee(num) {
  const emps = getEmps();
  const emp = emps.find(e => e.num === num);
  if (!emp) { viewEl.innerHTML = topbar("Employee") + `<div class="empty-note" style="margin-top:1rem">Employee not found.</div>`; return; }

  const ofis = getOfis().filter(o => o.empNum === emp.num);

  /* group training: dept -> station -> entries */
  const grouped = {};
  emp.training.forEach((tr, idx) => {
    const dKey = tr.dept, sKey = `${tr.station} — ${tr.area}`;
    grouped[dKey] = grouped[dKey] || {};
    grouped[dKey][sKey] = grouped[dKey][sKey] || [];
    grouped[dKey][sKey].push({ ...tr, idx });
  });

  const trainingHTML = Object.keys(grouped).length
    ? Object.entries(grouped).map(([dept, stations]) => `
      <div class="tree-dept">
        <h3>${esc(dept)}</h3>
        ${Object.entries(stations).map(([st, entries]) => `
          <div class="tree-station">
            <b>${esc(st)}</b>
            ${entries.map(en => `
              <div class="task-line">
                <span>${esc(en.task)}</span>
                <span class="row" style="gap:.2rem">
                  <span class="when">${esc(en.date)}</span>
                  <button class="task-del" data-del="${en.idx}" aria-label="Remove training">${icon("i-trash")}</button>
                </span>
              </div>`).join("")}
          </div>`).join("")}
      </div>`).join("")
    : `<p class="muted">No completed training on file.</p>`;

  viewEl.innerHTML = topbar("Employee", "training") + `
    <div class="page-pad"></div>
    <div class="card">
      <div class="emp-head">${AVATAR}
        <div>
          <div class="emp-name">${esc(emp.name)}</div>
          <div class="emp-num">Employee #${emp.num}</div>
        </div>
      </div>
      <div class="info-grid">
        <div><b>Birthday</b>${esc(emp.birthday)}</div>
        <div><b>Hire date</b>${esc(emp.hireDate)}</div>
        <div><b>Current department</b>${esc(emp.department)}</div>
        <div><b>Supervisor</b>${esc(emp.supervisor)}</div>
      </div>
    </div>

    <div class="card">
      <div class="row between">
        <h2>Completed Training</h2>
        <button class="btn primary" id="addTrainingBtn">${icon("i-plus")} Add Training</button>
      </div>
      <hr class="divider">
      ${trainingHTML}
      <div id="delPanel" hidden></div>
    </div>

    <div class="card">
      <h2>Absences</h2>
      <hr class="divider">
      ${emp.absences.length ? emp.absences.map(a => `
        <div class="task-line"><span>${esc(a.type)}</span><span class="when">${esc(a.date)}</span></div>`).join("")
        : `<p class="muted">No absences recorded.</p>`}
    </div>

    <div class="card">
      <h2>Submitted OFIs</h2>
      <p class="muted small" style="margin-top:.2rem">Tap an OFI to read the full idea.</p>
      <hr class="divider">
      ${ofis.length ? ofis.map((o, oi) => `
        <button class="ofi-row" data-ofi-toggle="${oi}">
          <span class="grow">${esc(o.title)}<br><span class="muted small">${esc(o.dept)} · ${esc(o.station)} · Submitted ${esc(fmtStamp(o.submittedAt))}</span></span>
          <span class="chip ${o.status === "approved" ? "ok" : o.status === "reviewing" ? "warn" : ""}">${esc(o.status.toUpperCase())}</span>
          <span class="chev">${icon("i-chev")}</span>
        </button>
        <div class="ofi-detail" id="ofiDetail${oi}" hidden>
          <p style="line-height:1.55">${esc(o.description)}</p>
          ${worksheetHTML(o.worksheet)}
        </div>`).join("")
        : `<p class="muted">No OFIs submitted.</p>`}
    </div>

    <div class="card">
      <h2>History</h2>
      <hr class="divider">
      ${emp.changeLog.length ? emp.changeLog.slice().reverse().map(c => `
        <div class="lib-field"><b>${esc(fmtDateTime(c.when))} — ${esc(c.by)}</b>
          ${esc(c.detail)}${c.reason ? ` — Reason: "${esc(c.reason)}"` : ""}</div>`).join("")
        : `<p class="muted">No changes logged.</p>`}
    </div>`;

  document.getElementById("addTrainingBtn").addEventListener("click", () => go(`emp/${emp.num}/add`));

  /* expandable OFI rows */
  viewEl.querySelectorAll("[data-ofi-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const d = document.getElementById("ofiDetail" + btn.dataset.ofiToggle);
      d.hidden = !d.hidden;
      btn.classList.toggle("open", !d.hidden);
    });
  });

  /* delete-training flow: inline reason panel */
  viewEl.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = +btn.dataset.del;
      const tr = emp.training[idx];
      const panel = document.getElementById("delPanel");
      panel.hidden = false;
      panel.innerHTML = `
        <hr class="divider">
        <h3>Remove "${esc(tr.task)}" (${esc(tr.station)})?</h3>
        <label class="field" style="margin:.7rem 0">Why is this training being removed? (required — this will be logged)
          <textarea id="delReason" rows="2" placeholder='e.g. "Accident"'></textarea>
        </label>
        <div class="row">
          <button class="btn danger" id="delConfirm">${icon("i-trash")} Remove Training</button>
          <button class="btn" id="delCancel">Cancel</button>
        </div>`;
      panel.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("delCancel").addEventListener("click", () => { panel.hidden = true; panel.innerHTML = ""; });
      document.getElementById("delConfirm").addEventListener("click", () => {
        const reason = document.getElementById("delReason").value.trim();
        if (!reason) { toast("A reason is required"); return; }
        const all = getEmps();
        const target = all.find(e => e.num === emp.num);
        const removed = target.training.splice(idx, 1)[0];
        target.changeLog.push({
          when: new Date().toISOString(),
          by: currentUser.label,
          detail: `Removed training: ${removed.task} — ${removed.station} (${removed.dept})`,
          reason,
        });
        saveLS(LS.emps, all);
        toast("Training removed and logged");
        render();
      });
    });
  });
}

/* ============================================================
   Add Training — cascade + sign-off
============================================================ */
function renderAddTraining(num) {
  const emp = getEmps().find(e => e.num === num);
  if (!emp) return go("training");

  viewEl.innerHTML = topbar("Add Training", `emp/${num}`) + `
    <div class="page-pad"></div>
    <div class="card">
      <div class="emp-head" style="margin-bottom:1rem">${AVATAR}
        <div><div class="emp-name">${esc(emp.name)}</div><div class="emp-num">Employee #${emp.num}</div></div>
      </div>
      <label class="field">Department
        <select id="selDept"><option value="">Select department…</option>
          ${getOrg().map(d => `<option>${esc(d.dept)}</option>`).join("")}
        </select>
      </label>
      <label class="field" style="margin-top:.8rem">Area
        <select id="selArea" disabled><option value="">Select area…</option></select>
      </label>
      <label class="field" style="margin-top:.8rem">Station
        <select id="selStation" disabled><option value="">Select station…</option></select>
      </label>
      <label class="field" style="margin-top:.8rem">Task
        <select id="selTask" disabled><option value="">Select task…</option></select>
      </label>
      <button class="btn primary block big" id="toSignoff" style="margin-top:1.2rem" disabled>Continue to Sign-Off</button>
    </div>
    <div id="signoffWrap"></div>`;

  const selDept = document.getElementById("selDept");
  const selArea = document.getElementById("selArea");
  const selStation = document.getElementById("selStation");
  const selTask = document.getElementById("selTask");
  const contBtn = document.getElementById("toSignoff");

  function fill(sel, items, placeholder) {
    sel.innerHTML = `<option value="">${placeholder}</option>` + items.map(i => `<option>${esc(i)}</option>`).join("");
    sel.disabled = items.length === 0;
  }
  selDept.addEventListener("change", () => {
    const d = getOrg().find(x => x.dept === selDept.value);
    fill(selArea, d ? d.areas.map(a => a.area) : [], "Select area…");
    fill(selStation, [], "Select station…"); fill(selTask, [], "Select task…");
    selStation.disabled = selTask.disabled = true; check();
  });
  selArea.addEventListener("change", () => {
    const d = getOrg().find(x => x.dept === selDept.value);
    const a = d && d.areas.find(x => x.area === selArea.value);
    fill(selStation, a ? a.stations.map(s => s.name) : [], "Select station…");
    fill(selTask, [], "Select task…"); selTask.disabled = true; check();
  });
  selStation.addEventListener("change", () => {
    const d = getOrg().find(x => x.dept === selDept.value);
    const a = d && d.areas.find(x => x.area === selArea.value);
    const s = a && a.stations.find(x => x.name === selStation.value);
    fill(selTask, s ? s.tasks : [], "Select task…"); check();
  });
  selTask.addEventListener("change", check);
  function check() {
    contBtn.disabled = !(selDept.value && selArea.value && selStation.value && selTask.value);
    document.getElementById("signoffWrap").innerHTML = "";
  }

  contBtn.addEventListener("click", () => {
    const now = new Date();
    const wrap = document.getElementById("signoffWrap");
    wrap.innerHTML = `
      <div class="card">
        <h2>Sign-Off</h2>
        <p class="muted small" style="margin:.4rem 0 1rem">Both management and the employee must sign
          to record this training. Entry date/time is logged automatically.</p>
        <div class="info-grid" style="margin-bottom:1rem">
          <div><b>Department</b>${esc(selDept.value)}</div>
          <div><b>Area</b>${esc(selArea.value)}</div>
          <div><b>Station</b>${esc(selStation.value)}</div>
          <div><b>Task</b>${esc(selTask.value)}</div>
          <div><b>Date</b>${now.toLocaleDateString()}</div>
          <div><b>Time</b>${now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</div>
        </div>
        <label class="field">Management signature (type full name)
          <input type="text" id="sigMgr" autocomplete="off">
        </label>
        <label class="field" style="margin-top:.8rem">Employee signature (type full name)
          <input type="text" id="sigEmp" autocomplete="off">
        </label>
        <button class="btn primary block big" id="completeBtn" style="margin-top:1.2rem" disabled>
          ${icon("i-check")} Complete
        </button>
      </div>`;
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
    const sigMgr = document.getElementById("sigMgr");
    const sigEmp = document.getElementById("sigEmp");
    const completeBtn = document.getElementById("completeBtn");
    const sigCheck = () => { completeBtn.disabled = !(sigMgr.value.trim() && sigEmp.value.trim()); };
    sigMgr.addEventListener("input", sigCheck);
    sigEmp.addEventListener("input", sigCheck);

    completeBtn.addEventListener("click", () => {
      const all = getEmps();
      const target = all.find(e => e.num === num);
      const stamp = new Date();
      target.training.push({
        dept: selDept.value, area: selArea.value, station: selStation.value, task: selTask.value,
        date: stamp.toISOString().slice(0, 10),
        time: stamp.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
        signedManager: sigMgr.value.trim(),
        signedEmployee: sigEmp.value.trim(),
      });
      target.changeLog.push({
        when: stamp.toISOString(),
        by: currentUser.label,
        detail: `Added training: ${selTask.value} — ${selStation.value} (${selDept.value}). Signed: ${sigMgr.value.trim()} / ${sigEmp.value.trim()}`,
        reason: "",
      });
      saveLS(LS.emps, all);
      toast("Training recorded");
      go(`emp/${num}`);
    });
  });
}

/* ============================================================
   Reinforcement (management) — Create / Live / History
============================================================ */
function renderReinforceHome() {
  const live = getAlertsStore().filter(a => a.status === "live").length;
  viewEl.innerHTML = topbar("Reinforcement") + `
    <p class="muted" style="padding:1rem 1.4rem 0">Request trained help at a station or across
      a department, track who has been approved, and review past requests.</p>
    <div class="page-pad"></div>
    <button class="list-row" id="rCreate" style="min-height:88px">
      <span class="app-icon" style="width:52px;height:52px">${icon("i-megaphone")}</span>
      <span class="grow"><b style="font-size:1.05rem">Create Alert</b><br>
        <span class="muted small">Station or department reinforcement request</span></span>
      <span class="chev">${icon("i-chev")}</span>
    </button>
    <button class="list-row" id="rLive" style="min-height:88px">
      <span class="app-icon" style="width:52px;height:52px">${icon("i-bell")}</span>
      <span class="grow"><b style="font-size:1.05rem">Live Alerts</b><br>
        <span class="muted small">${live} open request(s) — see approved employees and accept help</span></span>
      <span class="chev">${icon("i-chev")}</span>
    </button>
    <button class="list-row" id="rHist" style="min-height:88px">
      <span class="app-icon" style="width:52px;height:52px">${icon("i-clock")}</span>
      <span class="grow"><b style="font-size:1.05rem">History</b><br>
        <span class="muted small">Previous alerts in chronological order</span></span>
      <span class="chev">${icon("i-chev")}</span>
    </button>`;
  document.getElementById("rCreate").addEventListener("click", () => go("reinforce/create"));
  document.getElementById("rLive").addEventListener("click", () => go("reinforce/live"));
  document.getElementById("rHist").addEventListener("click", () => go("reinforce/history"));
}

function findTrainedAt(stations) {
  const names = stations.map(s => s.name);
  const hits = [];
  getEmps().forEach(e => {
    const matches = e.training.filter(tr => names.includes(tr.station));
    if (matches.length) hits.push({ emp: e, stations: [...new Set(matches.map(m => m.station))] });
  });
  return hits;
}

function renderReinforceCreate() {
  viewEl.innerHTML = topbar("Create Alert", "reinforce") + `
    <div class="page-pad"></div>
    <div class="card">
      <label class="field">Station ID
        <input type="text" id="stationId" list="stationList" placeholder="e.g. ST-110" autocomplete="off"
          style="text-transform:uppercase">
        <datalist id="stationList">
          ${allStations().map(s => `<option value="${s.id}">${esc(s.name)} — ${esc(s.dept)}</option>`).join("")}
        </datalist>
      </label>
      <label class="field" style="margin-top:.8rem">How many people do you need?
        <input type="number" id="stQty" value="1" min="1" max="20" inputmode="numeric">
      </label>
      <button class="btn primary block big" id="stationAlertBtn" style="margin-top:1rem">
        ${icon("i-megaphone")} Send Station Alert
      </button>
      <hr class="divider">
      <label class="field">Department Reinforcement
        <select id="deptSel"><option value="">Select department…</option>
          ${getOrg().map(d => `<option>${esc(d.dept)}</option>`).join("")}
        </select>
      </label>
      <label class="field" style="margin-top:.8rem">How many people do you need?
        <input type="number" id="deptQty" value="1" min="1" max="20" inputmode="numeric">
      </label>
      <button class="btn block big" id="deptAlertBtn" style="margin-top:1rem">
        ${icon("i-megaphone")} Send Department Alert
      </button>
    </div>`;

  function createAlert(title, stations, qty) {
    const hits = findTrainedAt(stations);
    const store = getAlertsStore();
    const alert = {
      id: "alert-" + Date.now(),
      title,
      when: new Date().toISOString(),
      qty,
      requestedBy: currentUser.label.split(" — ")[0],
      status: "live",
      candidates: hits.map(h => ({ name: h.emp.name, num: h.emp.num, stations: h.stations, response: null })),
      accepted: [],
    };
    store.push(alert);
    saveAlertsStore(store);
    toast(hits.length
      ? `Alert sent — ${hits.length} trained employee(s) across supervisors`
      : "Alert sent — no trained employees found for this selection");
    go("reinforce/live/" + alert.id);
  }

  document.getElementById("stationAlertBtn").addEventListener("click", () => {
    const id = document.getElementById("stationId").value.trim().toUpperCase();
    const st = allStations().find(s => s.id === id);
    if (!st) { toast("Unknown station ID — pick one from the list"); return; }
    const qty = Math.max(1, +document.getElementById("stQty").value || 1);
    createAlert(`Station ${st.id} — ${st.name} (${st.dept})`, [st], qty);
  });
  document.getElementById("deptAlertBtn").addEventListener("click", () => {
    const dept = document.getElementById("deptSel").value;
    if (!dept) { toast("Select a department first"); return; }
    const qty = Math.max(1, +document.getElementById("deptQty").value || 1);
    createAlert(`Department Assistance: ${dept}`, allStations().filter(s => s.dept === dept), qty);
  });
}

function renderReinforceLive() {
  const live = getAlertsStore().filter(a => a.status === "live")
    .sort((a, b) => b.when.localeCompare(a.when));
  viewEl.innerHTML = topbar("Live Alerts", "reinforce") + `
    <p class="muted" style="padding:1rem 1.4rem 0">Open requests. Tap one to see who has been
      approved and accept the help you want.</p>
    <div class="page-pad"></div>
    ${live.length ? live.map(a => {
      const approved = a.candidates.filter(c => c.response === "available").length;
      return `
      <button class="list-row" data-live="${esc(a.id)}">
        <span class="app-icon" style="width:52px;height:52px">${icon("i-bell")}</span>
        <span class="grow"><b>${esc(a.title)}</b><br>
          <span class="muted small">${esc(fmtStamp(a.when))} · Requested by ${esc(a.requestedBy)} ·
          Needs ${a.qty} · ${approved} approved · ${a.accepted.length}/${a.qty} accepted</span></span>
        <span class="chev">${icon("i-chev")}</span>
      </button>`;
    }).join("") : `<div class="empty-note">No live alerts.</div>`}`;
  viewEl.querySelectorAll("[data-live]").forEach(b =>
    b.addEventListener("click", () => go("reinforce/live/" + b.dataset.live)));
}

function renderReinforceLiveDetail(id) {
  const store = getAlertsStore();
  const a = store.find(x => x.id === id);
  if (!a) return go("reinforce/live");
  if (a.status !== "live") {
    viewEl.innerHTML = topbar("Alert", "reinforce/history") + `
      <div class="page-pad"></div>
      <div class="card"><h2>${esc(a.title)}</h2>
        <p class="muted">This alert is filled and closed. See History for details.</p></div>`;
    return;
  }
  const approved = a.candidates.filter(c => c.response === "available" && !a.accepted.includes(c.num));
  const acceptedList = a.candidates.filter(c => a.accepted.includes(c.num));
  const pending = a.candidates.filter(c => c.response === null);

  viewEl.innerHTML = topbar("Live Alert", "reinforce/live") + `
    <div class="page-pad"></div>
    <div class="card">
      <h2>${esc(a.title)}</h2>
      <p class="muted small">${esc(fmtStamp(a.when))} · Requested by ${esc(a.requestedBy)}</p>
      <div class="row" style="margin-top:.6rem;gap:.5rem;flex-wrap:wrap">
        <span class="chip">NEEDS ${a.qty}</span>
        <span class="chip ok">${a.accepted.length} ACCEPTED</span>
        <span class="chip warn">${approved.length} APPROVED &amp; WAITING</span>
        <span class="chip gray">${pending.length} AWAITING SUPERVISOR</span>
      </div>
      <div class="subhead">Approved employees — tap Accept to take them</div>
      ${approved.length ? approved.map(c => `
        <div class="cand-line">
          ${AVATAR.replace('class="emp-avatar"', 'class="emp-avatar" style="width:48px;height:48px"')}
          <span class="grow"><b>${esc(c.name)}</b> <span class="muted small">#${esc(c.num)}</span><br>
            <span class="muted small">Trained at: ${esc(c.stations.join(", "))}</span></span>
          <button class="btn approve" data-accept="${esc(c.num)}">${icon("i-check")} Accept</button>
        </div>`).join("")
        : `<p class="muted">No approved employees yet — waiting on their supervisors.</p>`}
      ${acceptedList.length ? `<div class="subhead">Accepted</div>
        ${acceptedList.map(c => `
          <div class="cand-line">
            ${AVATAR.replace('class="emp-avatar"', 'class="emp-avatar" style="width:48px;height:48px"')}
            <span class="grow"><b>${esc(c.name)}</b> <span class="muted small">#${esc(c.num)}</span></span>
            <span class="chip ok">COMING TO HELP</span>
          </div>`).join("")}` : ""}
    </div>`;

  viewEl.querySelectorAll("[data-accept]").forEach(btn => {
    btn.addEventListener("click", () => {
      const s = getAlertsStore();
      const al = s.find(x => x.id === id);
      if (!al.accepted.includes(btn.dataset.accept)) al.accepted.push(btn.dataset.accept);
      if (al.accepted.length >= al.qty) {
        al.status = "filled";
        saveAlertsStore(s);
        toast("Alert filled — removed from all supervisors' alerts");
        go("reinforce/history");
      } else {
        saveAlertsStore(s);
        toast("Accepted — still need " + (al.qty - al.accepted.length) + " more");
        renderReinforceLiveDetail(id);
      }
    });
  });
}

function renderReinforceHistory() {
  const hist = getAlertsStore().filter(a => a.status !== "live")
    .sort((a, b) => b.when.localeCompare(a.when));
  viewEl.innerHTML = topbar("History", "reinforce") + `
    <div class="page-pad"></div>
    ${hist.length ? hist.map(a => {
      const names = a.candidates.filter(c => a.accepted.includes(c.num)).map(c => `${c.name} (#${c.num})`);
      return `
      <div class="card">
        <div class="row between wrap">
          <h3>${esc(a.title)}</h3>
          <span class="chip ok">FILLED</span>
        </div>
        <p class="muted small">${esc(fmtStamp(a.when))} · Requested by ${esc(a.requestedBy)} · Needed ${a.qty}</p>
        <p style="margin-top:.5rem">Helped: ${esc(names.join(", ") || "—")}</p>
      </div>`;
    }).join("") : `<div class="empty-note">No past alerts.</div>`}`;
}

/* ============================================================
   Station data (Demo Arms) — shared by Trainer / SWI / Parts
============================================================ */
let STATION = null;
let stationPromise = null;
function loadStation() {
  if (!stationPromise) {
    stationPromise = fetch("station-data.json")
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(d => {
        STATION = d;
        STATION.byId = {};
        d.parts.forEach(p => { STATION.byId[p.id] = p; });
        return d;
      });
  }
  return stationPromise;
}
function needsStation(rerender) {
  if (STATION) return true;
  loadStation().then(rerender).catch(() => {
    viewEl.insertAdjacentHTML("beforeend",
      `<div class="empty-note">Couldn't load station-data.json. Serve over http or use the live site.</div>`);
  });
  viewEl.insertAdjacentHTML("beforeend", `<div class="empty-note">Loading station data…</div>`);
  return false;
}

function photoHTML(part) {
  if (part.photoFilename) {
    return `<img class="part-photo" src="part-photos/${esc(part.photoFilename)}" alt="${esc(part.name)}"
      onerror="this.outerHTML='<div class=&quot;photo-ph&quot;><svg class=&quot;ic&quot;><use href=&quot;#i-box&quot;/></svg><div>Photo pending</div><div>${esc(part.partNumber)}</div></div>'">`;
  }
  return `<div class="photo-ph">${icon("i-box")}<div>Photo pending</div><div>${esc(part.partNumber)}</div></div>`;
}
function renderPH(part) {
  return `<div class="render-ph"><span class="spin">${icon("i-cube", "ic spin-ic")}</span>
    <div>3D Render Pending</div><div>${esc(part.partNumber)}</div></div>`;
}

/* ============================================================
   Digital SWI — picker + viewer
============================================================ */
function renderSwiPicker() {
  viewEl.innerHTML = topbar("Digital SWI") + `
    <p class="muted" style="padding:1rem 1.4rem 0">Find the SWI for any station. Filter by
      department and area, or search.</p>
    <div class="card" style="margin-top:1rem">
      <div class="row wrap">
        <label class="field" style="flex:1;min-width:180px">Department
          <select id="swiDept"><option value="">All departments</option>
            ${getOrg().map(d => `<option>${esc(d.dept)}</option>`).join("")}
          </select>
        </label>
        <label class="field" style="flex:1;min-width:180px">Area
          <select id="swiArea"><option value="">All areas</option></select>
        </label>
      </div>
    </div>
    <div class="search-box">${icon("i-search")}
      <input type="search" id="swiQ" placeholder="Search SWIs by name or number" autocomplete="off">
    </div>
    <div id="swiList"></div>`;

  const deptSel = document.getElementById("swiDept");
  const areaSel = document.getElementById("swiArea");
  const q = document.getElementById("swiQ");

  deptSel.addEventListener("change", () => {
    const d = getOrg().find(x => x.dept === deptSel.value);
    areaSel.innerHTML = `<option value="">All areas</option>` +
      (d ? d.areas.map(a => `<option>${esc(a.area)}</option>`).join("") : "");
    draw();
  });
  areaSel.addEventListener("change", draw);
  q.addEventListener("input", draw);

  function draw() {
    const term = q.value.trim().toLowerCase();
    const list = SWI_CATALOG.filter(s =>
      (!deptSel.value || s.dept === deptSel.value) &&
      (!areaSel.value || s.area === areaSel.value) &&
      (!term || s.title.toLowerCase().includes(term) || s.num.includes(term) || s.station.toLowerCase().includes(term)));
    document.getElementById("swiList").innerHTML = list.length
      ? list.map(s => `
        <button class="list-row" data-swi="${s.id}">
          <span class="app-icon" style="width:52px;height:52px">${icon("i-clipboard")}</span>
          <span class="grow"><b>SWI ${esc(s.num)} — ${esc(s.title)}</b><br>
            <span class="muted small">${esc(s.dept)} · ${esc(s.area)} · ${esc(s.station)}</span></span>
          ${s.real ? `<span class="chip ok">LIVE</span>` : `<span class="chip gray">PENDING</span>`}
          <span class="chev">${icon("i-chev")}</span>
        </button>`).join("")
      : `<div class="empty-note">No SWIs match.</div>`;
    document.querySelectorAll("[data-swi]").forEach(b =>
      b.addEventListener("click", () => go("swi/" + b.dataset.swi)));
  }
  draw();
}

let swiIdx = 0;
function renderSwiViewer(id) {
  const meta = SWI_CATALOG.find(s => s.id === id);
  if (!meta) return go("swi");
  if (!meta.real) {
    viewEl.innerHTML = topbar("Digital SWI", "swi") + `
      <div class="page-pad"></div>
      <div class="card" style="text-align:center;padding:2.5rem 1.5rem">
        ${icon("i-doc", "ic").replace('class="ic"', 'class="ic" style="width:44px;height:44px;color:var(--muted);margin:0 auto"')}
        <h2 style="margin:.8rem 0 .4rem">SWI ${esc(meta.num)} — ${esc(meta.title)}</h2>
        <p class="muted">Content pending — this is a filler entry for the demo.<br>
        ${esc(meta.dept)} · ${esc(meta.area)} · ${esc(meta.station)}</p>
      </div>`;
    return;
  }
  if (!needsStation(() => renderSwiViewer(id))) return;

  const steps = STATION.assemblySteps;
  if (swiIdx >= steps.length) swiIdx = 0;
  const s = steps[swiIdx];
  const whiteNote = meta.variant === "TYPE-B"
    ? `<div class="restricted" style="margin:0 0 1rem">${icon("i-doc")} Type B build (SWI DEMO-0002 Rev A):
       step 8 uses DM-1011-B, step 11 uses DM-1013-B, step 26 uses DM-1021-B, and step 27 places
       finished arms on the cart instead of attaching to the frame.</div>` : "";

  viewEl.innerHTML = topbar(`SWI ${meta.num}`, "swi") + `
    <p class="muted" style="padding:1rem 1.4rem .8rem">${esc(meta.title)} — ${esc(meta.station)}</p>
    <div class="progress"><div style="width:${((swiIdx + 1) / steps.length) * 100}%"></div></div>
    <div class="card">
      ${whiteNote}
      <div class="step-label">STEP ${s.step} OF ${steps.length}</div>
      <div class="step-text">${esc(s.instruction)}</div>
      ${s.partsUsed.length ? `<div class="subhead">Parts in this step</div>
        <div class="part-grid">
          ${s.partsUsed.map(pid => {
            const p = STATION.byId[pid];
            return p ? `<div class="part-card">${photoHTML(p)}
              <div class="part-card-body"><div class="pn">${esc(p.partNumber)}</div>
              <div class="nm">${esc(p.name)}</div></div></div>` : "";
          }).join("")}
        </div>` : ""}
    </div>
    <div class="walk-nav">
      <button class="btn" id="wPrev" ${swiIdx === 0 ? "disabled" : ""}>${icon("i-back")} Back</button>
      <button class="btn primary" id="wNext" ${swiIdx === steps.length - 1 ? "disabled" : ""}>Next ${icon("i-chev")}</button>
    </div>
    <div class="jump">${steps.map((st, i) =>
      `<button data-i="${i}" class="${i === swiIdx ? "current" : ""}">${st.step}</button>`).join("")}</div>`;

  document.getElementById("wPrev").addEventListener("click", () => { swiIdx--; renderSwiViewer(id); });
  document.getElementById("wNext").addEventListener("click", () => { swiIdx++; renderSwiViewer(id); });
  viewEl.querySelectorAll(".jump [data-i]").forEach(b =>
    b.addEventListener("click", () => { swiIdx = +b.dataset.i; renderSwiViewer(id); }));
}

/* ============================================================
   Trainer — home / walkthrough / quiz
============================================================ */
function renderTrainerHome() {
  viewEl.innerHTML = topbar("Trainer") + `
    <p class="muted" style="padding:1rem 1.4rem 0">Learn a station's build step-by-step,
      then prove it in the quiz. Demo Arms is the live demo station.</p>
    <div class="page-pad"></div>
    <button class="list-row" id="tWalk" style="min-height:96px">
      <span class="app-icon">${icon("i-clipboard")}</span>
      <span class="grow"><b style="font-size:1.1rem">Walkthrough</b><br>
        <span class="muted small">Pick a station, then step through its build with 3D renders</span></span>
      <span class="chev">${icon("i-chev")}</span>
    </button>
    <button class="list-row" id="tQuiz" style="min-height:96px">
      <span class="app-icon">${icon("i-cap")}</span>
      <span class="grow"><b style="font-size:1.1rem">Build Quiz</b><br>
        <span class="muted small">Assemble the arm in order — pick the next part, 100% to pass</span></span>
      <span class="chev">${icon("i-chev")}</span>
    </button>`;
  document.getElementById("tWalk").addEventListener("click", () => go("trainer/walk"));
  document.getElementById("tQuiz").addEventListener("click", () => go("trainer/quiz"));
}

/* pick a station first — only Demo Arms has live walkthrough content */
function renderTrainerWalkPicker() {
  viewEl.innerHTML = topbar("Walkthrough", "trainer") + `
    <p class="muted" style="padding:1rem 1.4rem 0">Choose the station you want to walk through.</p>
    <div class="card" style="margin-top:1rem">
      <label class="field">Department
        <select id="twDept"><option value="">Select department…</option>
          ${getOrg().map(d => `<option>${esc(d.dept)}</option>`).join("")}
        </select>
      </label>
    </div>
    <div id="twStations"></div>`;

  const deptSel = document.getElementById("twDept");
  const draw = () => {
    const list = allStations().filter(s => !deptSel.value || s.dept === deptSel.value);
    document.getElementById("twStations").innerHTML = list.map(s => `
      <button class="list-row" data-tw="${esc(s.id)}">
        <span class="app-icon" style="width:52px;height:52px">${icon("i-cap")}</span>
        <span class="grow"><b>${esc(s.name)}</b><br>
          <span class="muted small">${esc(s.id)} · ${esc(s.dept)} · ${esc(s.area)}</span></span>
        ${s.name === "Demo Arms" ? `<span class="chip ok">LIVE</span>` : `<span class="chip gray">PENDING</span>`}
        <span class="chev">${icon("i-chev")}</span>
      </button>`).join("");
    viewEl.querySelectorAll("[data-tw]").forEach(b =>
      b.addEventListener("click", () => go("trainer/walk/" + encodeURIComponent(b.dataset.tw))));
  };
  deptSel.addEventListener("change", draw);
  draw();
}

let walkIdx = 0;
function renderTrainerWalk(stationId) {
  const st = allStations().find(s => s.id === stationId);
  if (!st) return go("trainer/walk");
  if (st.name !== "Demo Arms") {
    viewEl.innerHTML = topbar("Walkthrough", "trainer/walk") + `
      <div class="page-pad"></div>
      <div class="card" style="text-align:center;padding:2.5rem 1.5rem">
        <div class="render-ph" style="aspect-ratio:auto;padding:1.4rem;max-width:420px;margin:0 auto 1rem">
          <span class="spin">${icon("i-cube")}</span>
          <div>3D Render Pending</div>
        </div>
        <h2>${esc(st.name)} — ${esc(st.id)}</h2>
        <p class="muted">Walkthrough content for this station hasn't been built yet.
          Demo Arms is the live demo station.</p>
      </div>`;
    return;
  }
  const rerender = () => renderTrainerWalk(stationId);
  if (!needsStation(rerender)) {
    viewEl.innerHTML = topbar("Walkthrough", "trainer/walk") + viewEl.innerHTML;
    return;
  }
  const steps = STATION.assemblySteps;
  if (walkIdx >= steps.length) walkIdx = 0;
  const s = steps[walkIdx];

  viewEl.innerHTML = topbar("Demo Arms Walkthrough", "trainer/walk") + `
    <div style="height:1rem"></div>
    <div class="progress"><div style="width:${((walkIdx + 1) / steps.length) * 100}%"></div></div>
    <div class="card">
      <div class="step-label">STEP ${s.step} OF ${steps.length}</div>
      <div class="step-text">${esc(s.instruction)}</div>
      <div class="subhead">${s.partsUsed.length ? "Step renders" : "No parts in this step"}</div>
      <div class="part-grid">
        ${s.partsUsed.length
          ? s.partsUsed.map(pid => {
              const p = STATION.byId[pid];
              return p ? `<div class="part-card">${renderPH(p)}
                <div class="part-card-body"><div class="pn">${esc(p.partNumber)}</div>
                <div class="nm">${esc(p.name)}</div></div></div>` : "";
            }).join("")
          : `<div class="part-card"><div class="render-ph"><span class="spin">${icon("i-cube")}</span>
             <div>3D Render Pending</div><div>Process step</div></div></div>`}
      </div>
    </div>
    <div class="walk-nav">
      <button class="btn" id="wPrev" ${walkIdx === 0 ? "disabled" : ""}>${icon("i-back")} Back</button>
      <button class="btn primary" id="wNext" ${walkIdx === steps.length - 1 ? "disabled" : ""}>Next ${icon("i-chev")}</button>
    </div>
    <div class="jump">${steps.map((st, i) =>
      `<button data-i="${i}" class="${i === walkIdx ? "current" : ""}">${st.step}</button>`).join("")}</div>`;

  document.getElementById("wPrev").addEventListener("click", () => { walkIdx--; rerender(); });
  document.getElementById("wNext").addEventListener("click", () => { walkIdx++; rerender(); });
  viewEl.querySelectorAll(".jump [data-i]").forEach(b =>
    b.addEventListener("click", () => { walkIdx = +b.dataset.i; rerender(); }));
}

/* --- Build quiz ------------------------------------------------ */
let quiz = null;
function newQuiz() {
  /* chronological sequence: each part the first time it's used, in step order */
  const seen = new Set();
  const seq = [];
  STATION.assemblySteps.forEach(st => {
    st.partsUsed.forEach(pid => {
      if (!seen.has(pid)) { seen.add(pid); seq.push({ pid, step: st.step }); }
    });
  });
  quiz = {
    seq,
    idx: 0,
    misses: 0,           // wrong guesses on current target
    results: [],         // true = first-try correct
    tray: seq.map(x => x.pid).sort(() => Math.random() - 0.5),
    done: false,
  };
}

function renderTrainerQuiz() {
  if (!needsStation(renderTrainerQuiz)) {
    viewEl.innerHTML = topbar("Build Quiz", "trainer") + viewEl.innerHTML;
    return;
  }
  if (!quiz || quiz.finishedSession) newQuiz();

  if (quiz.done) {
    const right = quiz.results.filter(Boolean).length;
    const pct = Math.round((right / quiz.results.length) * 100);
    const pass = pct === 100;
    viewEl.innerHTML = topbar("Build Quiz", "trainer") + `
      <div class="page-pad"></div>
      <div class="card quiz-result ${pass ? "pass" : "fail"}">
        <div class="big">${pass ? "PASSED" : "FAILED — TRY AGAIN"}</div>
        <p style="font-size:1.15rem;font-weight:700">${right} of ${quiz.results.length} parts first-try · ${pct}% accuracy</p>
        <p class="muted" style="margin:.5rem 0 1.4rem">${pass
          ? "Perfect build — every part placed in the right order."
          : "You need 100% to pass. Review the walkthrough and run it again."}</p>
        <div class="row" style="justify-content:center">
          <button class="btn primary big" id="qRetry">Try Again</button>
          <button class="btn big" id="qWalk">Review Walkthrough</button>
        </div>
      </div>`;
    document.getElementById("qRetry").addEventListener("click", () => { newQuiz(); renderTrainerQuiz(); });
    document.getElementById("qWalk").addEventListener("click", () => go("trainer/walk"));
    return;
  }

  const target = quiz.seq[quiz.idx];
  const applied = quiz.seq.slice(0, quiz.idx);

  viewEl.innerHTML = topbar("Build Quiz", "trainer") + `
    <div style="height:1rem"></div>
    <div class="progress"><div style="width:${(quiz.idx / quiz.seq.length) * 100}%"></div></div>
    <div class="quiz-layout">
      <div class="card build-area">
        <div class="row between">
          <h2>Assembly</h2>
          <span class="chip">PART ${quiz.idx + 1} OF ${quiz.seq.length}</span>
        </div>
        <p class="muted small" style="margin:.3rem 0 .9rem">Around step ${target.step} —
          what part goes on next?${quiz.misses > 0 ? ` <b style="color:var(--bad)">(${3 - quiz.misses} guess${3 - quiz.misses === 1 ? "" : "es"} left)</b>` : ""}</p>
        <div class="render-ph" style="aspect-ratio:auto;padding:1.2rem">
          <span class="spin">${icon("i-cube")}</span>
          <div>3D Render Pending — assembly animates here</div>
        </div>
        <div class="subhead">Applied so far</div>
        <div class="build-list">
          ${applied.length ? applied.map(a => {
            const p = STATION.byId[a.pid];
            return `<div class="build-item">${icon("i-check")}<span>${esc(p.partNumber)} — ${esc(p.name)}</span></div>`;
          }).join("") : `<p class="muted small">Nothing applied yet — pick the first part.</p>`}
        </div>
      </div>
      <div class="card">
        <h2 style="margin-bottom:.8rem">Parts tray</h2>
        <div class="tray">
          ${quiz.tray.map(pid => {
            const p = STATION.byId[pid];
            const used = quiz.seq.findIndex(x => x.pid === pid) < quiz.idx;
            return `<button class="tray-tile ${used ? "done" : ""}" data-pick="${pid}" ${used ? "disabled" : ""}>
              ${icon("i-cube")}
              <span class="pn">${esc(p.partNumber)}</span>
              <span>${esc(p.name)}</span>
            </button>`;
          }).join("")}
        </div>
      </div>
    </div>`;

  viewEl.querySelectorAll("[data-pick]").forEach(btn => {
    btn.addEventListener("click", () => {
      const pick = btn.dataset.pick;
      if (pick === target.pid) {
        quiz.results.push(quiz.misses === 0);
        quiz.misses = 0;
        quiz.idx++;
        if (quiz.idx >= quiz.seq.length) quiz.done = true;
        renderTrainerQuiz();
      } else {
        quiz.misses++;
        if (quiz.misses >= 3) {
          /* auto-apply after 3 wrong guesses; counts as wrong */
          quiz.results.push(false);
          quiz.misses = 0;
          quiz.idx++;
          if (quiz.idx >= quiz.seq.length) quiz.done = true;
          toast("Applied for you — marked incorrect");
          renderTrainerQuiz();
        } else {
          btn.classList.remove("shake");
          void btn.offsetWidth; /* restart animation */
          btn.classList.add("shake");
          const note = viewEl.querySelector(".quiz-layout .muted.small");
          if (note) note.innerHTML = `Around step ${target.step} — check again!
            <b style="color:var(--bad)">(${3 - quiz.misses} guess${3 - quiz.misses === 1 ? "" : "es"} left)</b>`;
        }
      }
    });
  });
}

/* ============================================================
   OFI Submit
============================================================ */
function renderOfiSubmit() {
  viewEl.innerHTML = topbar("OFI Submit") + `
    <p class="muted" style="padding:1rem 1.4rem 0">Opportunity For Improvement — tell us what
      would make your station better.</p>
    <div class="card" style="margin-top:1rem">
      <div class="row wrap">
        <label class="field" style="flex:1;min-width:170px">Your name
          <input type="text" id="ofiName" autocomplete="off"></label>
        <label class="field" style="flex:1;min-width:140px">Employee #
          <input type="text" id="ofiNum" inputmode="numeric" autocomplete="off"></label>
      </div>
      <label class="field" style="margin-top:.8rem">Department
        <select id="ofiDept"><option value="">Select…</option>${getOrg().map(d => `<option>${esc(d.dept)}</option>`).join("")}</select>
      </label>
      <div class="row wrap" style="margin-top:.8rem">
        <label class="field" style="flex:1;min-width:170px">Area
          <select id="ofiArea" disabled><option value="">Select…</option></select></label>
        <label class="field" style="flex:1;min-width:170px">Station
          <select id="ofiStation" disabled><option value="">Select…</option></select></label>
      </div>
      <label class="field" style="margin-top:.8rem">Idea title
        <input type="text" id="ofiTitle" maxlength="100" autocomplete="off"></label>
      <label class="field" style="margin-top:.8rem">Describe the improvement
        <textarea id="ofiDesc" placeholder="What's the problem, what's your idea, what does it save?"></textarea></label>
      <button class="btn primary block big" id="ofiSubmitBtn" style="margin-top:1.2rem">Submit OFI</button>
    </div>`;

  const dept = document.getElementById("ofiDept");
  const area = document.getElementById("ofiArea");
  const station = document.getElementById("ofiStation");
  dept.addEventListener("change", () => {
    const d = getOrg().find(x => x.dept === dept.value);
    area.innerHTML = `<option value="">Select…</option>` + (d ? d.areas.map(a => `<option>${esc(a.area)}</option>`).join("") : "");
    area.disabled = !d;
    station.innerHTML = `<option value="">Select…</option>`; station.disabled = true;
  });
  area.addEventListener("change", () => {
    const d = getOrg().find(x => x.dept === dept.value);
    const a = d && d.areas.find(x => x.area === area.value);
    station.innerHTML = `<option value="">Select…</option>` + (a ? a.stations.map(s => `<option>${esc(s.name)}</option>`).join("") : "");
    station.disabled = !a;
  });

  document.getElementById("ofiSubmitBtn").addEventListener("click", () => {
    const name = document.getElementById("ofiName").value.trim();
    const title = document.getElementById("ofiTitle").value.trim();
    const desc = document.getElementById("ofiDesc").value.trim();
    if (!name || !title || !desc || !dept.value) { toast("Fill in name, department, title and description"); return; }
    const list = getOfis();
    list.unshift({
      id: "ofi-" + Date.now(),
      submitter: name,
      empNum: document.getElementById("ofiNum").value.trim(),
      dept: dept.value, area: area.value || "—", station: station.value || "—",
      title, description: desc,
      status: "submitted",
      submittedAt: new Date().toISOString(),
    });
    saveLS(LS.ofis, list);
    toast("OFI submitted — thank you");
    renderOfiSubmit();
  });
}

/* ============================================================
   OFI Review (management)
============================================================ */
const OFI_STATUSES = ["submitted", "reviewing", "approved"];
function renderOfiReview() {
  viewEl.innerHTML = topbar("OFI Review") + `
    <div class="card" style="margin-top:1rem">
      <div class="row wrap">
        <label class="field" style="flex:1;min-width:150px">Department
          <select id="rDept"><option value="">All</option>${getOrg().map(d => `<option>${esc(d.dept)}</option>`).join("")}</select></label>
        <label class="field" style="flex:1;min-width:150px">Area
          <select id="rArea"><option value="">All</option></select></label>
        <label class="field" style="flex:1;min-width:150px">Station
          <select id="rStation"><option value="">All</option></select></label>
      </div>
    </div>
    <div id="ofiList"></div>`;

  const rDept = document.getElementById("rDept");
  const rArea = document.getElementById("rArea");
  const rStation = document.getElementById("rStation");
  rDept.addEventListener("change", () => {
    const d = getOrg().find(x => x.dept === rDept.value);
    rArea.innerHTML = `<option value="">All</option>` + (d ? d.areas.map(a => `<option>${esc(a.area)}</option>`).join("") : "");
    rStation.innerHTML = `<option value="">All</option>`;
    draw();
  });
  rArea.addEventListener("change", () => {
    const d = getOrg().find(x => x.dept === rDept.value);
    const a = d && d.areas.find(x => x.area === rArea.value);
    rStation.innerHTML = `<option value="">All</option>` + (a ? a.stations.map(s => `<option>${esc(s.name)}</option>`).join("") : "");
    draw();
  });
  rStation.addEventListener("change", draw);

  function draw() {
    const list = getOfis().filter(o =>
      (!rDept.value || o.dept === rDept.value) &&
      (!rArea.value || o.area === rArea.value) &&
      (!rStation.value || o.station === rStation.value));
    document.getElementById("ofiList").innerHTML = list.length
      ? list.map(o => `
        <div class="card">
          <div class="row between wrap">
            <div>
              <h3>${esc(o.title)}</h3>
              <p class="muted small">${esc(o.submitter)}${o.empNum ? ` (#${esc(o.empNum)})` : ""} ·
                ${esc(o.dept)} · ${esc(o.area)} · ${esc(o.station)}<br>
                Submitted ${esc(fmtDateTime(o.submittedAt))}</p>
            </div>
            <select class="status-select" data-ofi="${esc(o.id)}">
              ${OFI_STATUSES.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s.toUpperCase()}</option>`).join("")}
            </select>
          </div>
          <p style="margin-top:.6rem;line-height:1.5">${esc(o.description)}</p>
          ${worksheetHTML(o.worksheet)}
        </div>`).join("")
      : `<div class="empty-note">No OFIs match these filters.</div>`;
    document.querySelectorAll("[data-ofi]").forEach(sel => {
      sel.addEventListener("change", () => {
        const all = getOfis();
        const o = all.find(x => x.id === sel.dataset.ofi);
        if (o) { o.status = sel.value; saveLS(LS.ofis, all); toast("Status updated"); }
      });
    });
  }
  draw();
}

/* ============================================================
   Part Library
============================================================ */
function renderPartLibrary() {
  viewEl.innerHTML = topbar("Part Library") + `
    <p class="muted" style="padding:1rem 1.4rem 0">Demo Arms station parts — search by name
      or part number.</p>
    <div class="search-box">${icon("i-search")}
      <input type="search" id="partQ" placeholder="Search name or part number" autocomplete="off">
    </div>
    <div id="partResults"></div>`;
  if (!needsStation(renderPartLibrary)) return;

  const input = document.getElementById("partQ");
  const stepNum = id => {
    const s = STATION.assemblySteps.find(st => st.id === id);
    return s ? s.step : "?";
  };
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const results = STATION.parts.filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.partNumber.toLowerCase().includes(q));
    document.getElementById("partResults").innerHTML = results.length
      ? results.map(p => `
        <div class="card lib-card">
          ${photoHTML(p)}
          <div class="lib-body">
            <div class="part-card-body" style="padding:0 0 .5rem"><div class="pn">${esc(p.partNumber)}</div>
              <h3>${esc(p.name)}</h3></div>
            <div class="lib-field"><b>What it is</b>${esc(p.whatItIs)}</div>
            <div class="lib-field"><b>Where it's stored</b>${esc(p.whereStored)}</div>
            <div class="lib-field"><b>Used in steps</b>
              ${p.usedInSteps.map(id => `<span class="chip gray" style="margin:.15rem .2rem 0 0">Step ${stepNum(id)}</span>`).join("") || "—"}</div>
          </div>
        </div>`).join("")
      : `<div class="empty-note">No parts match "${esc(input.value)}".</div>`;
  };
  input.addEventListener("input", draw);
  draw();
}

/* ============================================================
   Injury Report
============================================================ */
function renderInjury() {
  viewEl.innerHTML = topbar("Injury Report") + `
    <div class="restricted" style="margin-top:1rem">${icon("i-aid")}
      Demo form — for a real injury, notify your supervisor immediately.</div>
    <div class="card">
      <label class="field">Your name
        <input type="text" id="injName" autocomplete="off"></label>
      <label class="field" style="margin-top:.8rem">What happened?
        <textarea id="injWhat" placeholder="Describe the injury and how it occurred"></textarea></label>
      <label class="field" style="margin-top:.8rem">Where did it happen?
        <select id="injWhere"><option value="">Select department…</option>
          ${getOrg().map(d => `<option>${esc(d.dept)}</option>`).join("")}
        </select></label>
      <label class="field" style="margin-top:.8rem">When did it happen?
        <input type="datetime-local" id="injWhen"></label>
      <button class="btn primary block big" id="injBtn" style="margin-top:1.2rem">Submit Report</button>
    </div>`;

  document.getElementById("injBtn").addEventListener("click", () => {
    const name = document.getElementById("injName").value.trim();
    const what = document.getElementById("injWhat").value.trim();
    const where = document.getElementById("injWhere").value;
    const when = document.getElementById("injWhen").value;
    if (!name || !what || !where || !when) { toast("All fields are required"); return; }
    const list = loadLS(LS.injuries, []);
    list.unshift({ name, what, where, when, submitted: new Date().toISOString() });
    saveLS(LS.injuries, list);
    toast("Report submitted");
    renderInjury();
  });
}

/* ============================================================
   Submitted Injury Reports (management)
============================================================ */
function renderInjuriesReview() {
  const reports = loadLS(LS.injuries, []);
  viewEl.innerHTML = topbar("Submitted Injury Reports") + `
    <div class="page-pad"></div>
    ${reports.length ? reports.map(r => `
      <div class="card">
        <div class="row between wrap">
          <h3>${esc(r.name)}</h3>
          <span class="chip gray">Submitted ${esc(fmtStamp(r.submitted))}</span>
        </div>
        <hr class="divider">
        <div class="lib-field"><b>What happened</b>${esc(r.what)}</div>
        <div class="lib-field"><b>Department</b>${esc(r.where)}</div>
        <div class="lib-field"><b>When it happened</b>${esc((r.when || "").replace("T", " "))}</div>
      </div>`).join("") : `<div class="empty-note">No injury reports submitted.</div>`}`;
}

/* ============================================================
   Stations — lookup for everyone, add/edit for management
============================================================ */
function renderStations() {
  viewEl.innerHTML = topbar("Stations") + `
    <p class="muted" style="padding:1rem 1.4rem 0">Look up any work station — find its
      station ID, department, tasks, and who is trained there.</p>
    <div class="search-box">${icon("i-search")}
      <input type="search" id="stQ" placeholder="Search by station name or ID" autocomplete="off">
    </div>
    ${isMgmt() ? `<div style="padding:0 1.2rem 1rem">
      <button class="btn primary" id="addStationBtn">${icon("i-plus")} Add Station</button>
    </div><div id="addStationWrap"></div>` : ""}
    <div id="stResults"></div>`;

  const input = document.getElementById("stQ");
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const list = allStations().filter(s =>
      !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q));
    document.getElementById("stResults").innerHTML = list.length
      ? list.map(s => `
        <button class="list-row" data-st="${esc(s.id)}">
          <span class="app-icon" style="width:52px;height:52px">${icon("i-pin")}</span>
          <span class="grow"><b>${esc(s.name)}</b><br>
            <span class="muted small">${esc(s.id)} · ${esc(s.dept)} · ${esc(s.area)}</span></span>
          <span class="chev">${icon("i-chev")}</span>
        </button>`).join("")
      : `<div class="empty-note">No stations match "${esc(input.value)}".</div>`;
    document.querySelectorAll("[data-st]").forEach(b =>
      b.addEventListener("click", () => go("stations/" + encodeURIComponent(b.dataset.st))));
  };
  input.addEventListener("input", draw);
  draw();

  if (isMgmt()) {
    document.getElementById("addStationBtn").addEventListener("click", () => {
      const wrap = document.getElementById("addStationWrap");
      const org = getOrg();
      wrap.innerHTML = `
        <div class="card">
          <h2>Add Station</h2>
          <label class="field" style="margin-top:.8rem">Department
            <select id="nsDept">${org.map(d => `<option>${esc(d.dept)}</option>`).join("")}</select></label>
          <label class="field" style="margin-top:.8rem">Area
            <select id="nsArea">${org[0].areas.map(a => `<option>${esc(a.area)}</option>`).join("")}</select></label>
          <label class="field" style="margin-top:.8rem">Station name
            <input type="text" id="nsName" autocomplete="off"></label>
          <label class="field" style="margin-top:.8rem">Station ID
            <input type="text" id="nsId" placeholder="e.g. ST-115" autocomplete="off" style="text-transform:uppercase"></label>
          <label class="field" style="margin-top:.8rem">Tasks (comma-separated)
            <input type="text" id="nsTasks" placeholder="task1, task2" autocomplete="off"></label>
          <div class="row" style="margin-top:1rem">
            <button class="btn primary" id="nsSave">${icon("i-check")} Save Station</button>
            <button class="btn" id="nsCancel">Cancel</button>
          </div>
        </div>`;
      const nsDept = document.getElementById("nsDept");
      nsDept.addEventListener("change", () => {
        const d = getOrg().find(x => x.dept === nsDept.value);
        document.getElementById("nsArea").innerHTML = d.areas.map(a => `<option>${esc(a.area)}</option>`).join("");
      });
      document.getElementById("nsCancel").addEventListener("click", () => { wrap.innerHTML = ""; });
      document.getElementById("nsSave").addEventListener("click", () => {
        const name = document.getElementById("nsName").value.trim();
        const id = document.getElementById("nsId").value.trim().toUpperCase();
        if (!name || !id) { toast("Name and ID are required"); return; }
        if (allStations().some(s => s.id === id)) { toast("That station ID already exists"); return; }
        const o = getOrg();
        const d = o.find(x => x.dept === nsDept.value);
        const a = d.areas.find(x => x.area === document.getElementById("nsArea").value);
        a.stations.push({
          id, name,
          tasks: document.getElementById("nsTasks").value.split(",").map(s => s.trim()).filter(Boolean),
        });
        saveLS(LS.org, o);
        toast("Station added");
        renderStations();
      });
    });
  }
}

function renderStationPage(id) {
  const st = allStations().find(s => s.id === id);
  if (!st) { viewEl.innerHTML = topbar("Station", "stations") + `<div class="empty-note" style="margin-top:1rem">Station not found.</div>`; return; }

  /* who is trained here */
  const trained = [];
  getEmps().forEach(e => {
    const tasks = e.training.filter(tr => tr.station === st.name).map(tr => tr.task);
    if (tasks.length) trained.push({ e, tasks: [...new Set(tasks)] });
  });

  const swis = SWI_CATALOG.filter(s => s.station === st.name);

  viewEl.innerHTML = topbar(st.name, "stations") + `
    <div class="page-pad"></div>
    <div class="card">
      <div class="row between wrap">
        <div>
          <h2>${esc(st.name)}</h2>
          <p class="muted">Station ID: <b>${esc(st.id)}</b></p>
        </div>
        ${isMgmt() ? `<button class="btn" id="editStBtn">Edit Station</button>` : ""}
      </div>
      <div class="info-grid">
        <div><b>Department</b>${esc(st.dept)}</div>
        <div><b>Area</b>${esc(st.area)}</div>
      </div>
      <div class="subhead">Tasks at this station</div>
      ${st.tasks.length ? st.tasks.map(t => `<span class="chip gray" style="margin:0 .3rem .3rem 0">${esc(t)}</span>`).join("") : `<p class="muted">No tasks recorded.</p>`}
      ${swis.length ? `<div class="subhead">SWIs</div>
        ${swis.map(s => `<div class="task-line"><span>SWI ${esc(s.num)} — ${esc(s.title)}</span>
          <span class="chip ${s.real ? "ok" : "gray"}">${s.real ? "LIVE" : "PENDING"}</span></div>`).join("")}` : ""}
      <div id="editStWrap"></div>
    </div>
    <div class="card">
      <h2>Trained employees</h2>
      <hr class="divider">
      ${trained.length ? trained.map(x => `
        <div class="task-line">
          <span>${esc(x.e.name)} <span class="muted small">#${x.e.num}</span></span>
          <span class="muted small">${esc(x.tasks.join(", "))}</span>
        </div>`).join("") : `<p class="muted">No employees have completed training here yet.</p>`}
    </div>`;

  if (isMgmt()) {
    document.getElementById("editStBtn").addEventListener("click", () => {
      const wrap = document.getElementById("editStWrap");
      wrap.innerHTML = `
        <hr class="divider">
        <h3>Edit station</h3>
        <label class="field" style="margin-top:.6rem">Station name
          <input type="text" id="esName" value="${esc(st.name)}"></label>
        <label class="field" style="margin-top:.6rem">Station ID
          <input type="text" id="esId" value="${esc(st.id)}" style="text-transform:uppercase"></label>
        <label class="field" style="margin-top:.6rem">Tasks (comma-separated)
          <input type="text" id="esTasks" value="${esc(st.tasks.join(", "))}"></label>
        <div class="row" style="margin-top:1rem">
          <button class="btn primary" id="esSave">${icon("i-check")} Save Changes</button>
          <button class="btn" id="esCancel">Cancel</button>
        </div>`;
      document.getElementById("esCancel").addEventListener("click", () => { wrap.innerHTML = ""; });
      document.getElementById("esSave").addEventListener("click", () => {
        const newName = document.getElementById("esName").value.trim();
        const newId = document.getElementById("esId").value.trim().toUpperCase();
        if (!newName || !newId) { toast("Name and ID are required"); return; }
        if (newId !== st.id && allStations().some(s => s.id === newId)) { toast("That station ID already exists"); return; }
        const o = getOrg();
        for (const d of o) for (const a of d.areas) for (const s of a.stations) {
          if (s.id === st.id) {
            s.name = newName;
            s.id = newId;
            s.tasks = document.getElementById("esTasks").value.split(",").map(x => x.trim()).filter(Boolean);
          }
        }
        saveLS(LS.org, o);
        toast("Station updated");
        go("stations/" + encodeURIComponent(newId));
      });
    });
  }
}

/* ============================================================
   Alerts (management inbox) — approve or deny your employees
============================================================ */
function renderAlerts() {
  const inbox = inboxAlerts().slice().reverse();
  viewEl.innerHTML = topbar("Alerts") + `
    <p class="muted" style="padding:1rem 1.4rem 0">Reinforcement requests from around the
      facility. Mark an employee <b>Available</b> to send them, or <b>Deny</b> if you need them.
      An alert leaves this list once it's filled — or once you've denied all of your candidates.</p>
    <div class="page-pad"></div>
    ${inbox.length ? inbox.map(a => `
      <div class="card">
        <div class="row between wrap">
          <h3>${esc(a.title)}</h3>
          <span class="chip">REQUESTING ${a.qty}</span>
        </div>
        <p class="muted small">${esc(fmtStamp(a.when))} · Requested by ${esc(a.requestedBy)} ·
          ${a.accepted.length}/${a.qty} spots filled</p>
        <hr class="divider">
        ${a.candidates.map((c, ci) => `
          <div class="cand-line">
            ${AVATAR.replace('class="emp-avatar"', 'class="emp-avatar" style="width:48px;height:48px"')}
            <span class="grow"><b>${esc(c.name)}</b> <span class="muted small">#${esc(c.num)}</span><br>
              <span class="muted small">Trained at: ${esc(c.stations.join(", "))}</span></span>
            ${a.accepted.includes(c.num)
              ? `<span class="chip ok">ACCEPTED — COMING TO HELP</span>`
              : c.response === "available"
                ? `<span class="chip ok">MARKED AVAILABLE</span>`
              : c.response === "denied"
                ? `<span class="chip bad">DENIED</span>`
                : `<button class="btn approve" data-avail="${esc(a.id)}|${ci}">${icon("i-check")} Available</button>
                   <button class="btn deny" data-deny="${esc(a.id)}|${ci}">${icon("i-x")} Deny</button>`}
          </div>`).join("")}
      </div>`).join("") : `<div class="empty-note">No alerts — you're all caught up.</div>`}`;

  function respond(key, response) {
    const [aid, ci] = key.split("|");
    const store = getAlertsStore();
    const al = store.find(x => x.id === aid);
    if (al) {
      al.candidates[+ci].response = response;
      saveAlertsStore(store);
      toast(response === "available"
        ? `${al.candidates[+ci].name} marked available — ${al.requestedBy} can now accept them`
        : `${al.candidates[+ci].name} denied — they stay with you`);
      renderAlerts();
    }
  }
  viewEl.querySelectorAll("[data-avail]").forEach(b =>
    b.addEventListener("click", () => respond(b.dataset.avail, "available")));
  viewEl.querySelectorAll("[data-deny]").forEach(b =>
    b.addEventListener("click", () => respond(b.dataset.deny, "denied")));
}

/* auto-resume an existing session (must run after all definitions) */
if (currentUser) enterApp();
