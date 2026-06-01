/* ============================================================
   ChoreQuest — 100% client-side family chore tracker
   All data is persisted to localStorage. Nothing is sent
   to any server or external database.
   ============================================================ */

const STORAGE_KEY = "chorequest.v1";
const AVATARS = ["🦄", "🐯", "🐱", "🐶", "🦊", "🐸", "🐵", "🐼", "🦁", "🐲", "🦖", "🚀", "⚽", "🎸", "🌟", "🦋"];
const PARENT_AVATARS = ["👩", "👨", "🧑", "👩‍🦰", "👨‍🦱", "👵", "👴", "🦸‍♀️", "🦸‍♂️", "👩‍🍳", "👨‍🍳", "🐻", "🦉", "👑", "🌟", "💪"];

/* ---- Pre-canned chore library ---- */
const PRESET_CHORES = [
  { name: "Make the bed", points: 5, category: "Bedroom" },
  { name: "Tidy bedroom", points: 10, category: "Bedroom" },
  { name: "Put away laundry", points: 10, category: "Laundry" },
  { name: "Load the dishwasher", points: 10, category: "Kitchen" },
  { name: "Unload the dishwasher", points: 10, category: "Kitchen" },
  { name: "Set the table", points: 5, category: "Kitchen" },
  { name: "Clear the table", points: 5, category: "Kitchen" },
  { name: "Take out the trash", points: 8, category: "General" },
  { name: "Feed the pet", points: 5, category: "Pets" },
  { name: "Walk the dog", points: 15, category: "Pets" },
  { name: "Vacuum a room", points: 12, category: "General" },
  { name: "Wipe the counters", points: 8, category: "Kitchen" },
  { name: "Clean the bathroom sink", points: 12, category: "Bathroom" },
  { name: "Water the plants", points: 6, category: "Outdoor" },
  { name: "Rake the leaves", points: 20, category: "Outdoor" },
  { name: "Do homework", points: 15, category: "School" },
  { name: "Read for 20 minutes", points: 10, category: "School" },
  { name: "Sort recycling", points: 8, category: "General" },
];

/* ---- Badge & milestone definitions ---- */
const BADGES = [
  { id: "first",     icon: "🌱", name: "First Step",   test: (k) => k.completedCount >= 1 },
  { id: "five",      icon: "✋", name: "High Five",     test: (k) => k.completedCount >= 5 },
  { id: "ten",       icon: "🔟", name: "Perfect 10",    test: (k) => k.completedCount >= 10 },
  { id: "p50",       icon: "⭐", name: "50 Points",     test: (k) => k.points >= 50 },
  { id: "p100",      icon: "💯", name: "Century",       test: (k) => k.points >= 100 },
  { id: "p250",      icon: "🏅", name: "250 Club",      test: (k) => k.points >= 250 },
  { id: "p500",      icon: "🏆", name: "Champion",      test: (k) => k.points >= 500 },
  { id: "allround",  icon: "🌈", name: "All-Rounder",   test: (k) => categoriesDone(k) >= 4 },
];

const MILESTONES = [
  { points: 50,  label: "Movie Night 🎬" },
  { points: 100, label: "Ice Cream Treat 🍦" },
  { points: 250, label: "Toy Reward 🧸" },
  { points: 500, label: "Big Day Out 🎢" },
];

/* ---- Pre-canned reward store ---- */
const PRESET_REWARDS = [
  { icon: "📺", name: "Extra TV time (30 min)",   cost: 25 },
  { icon: "🎮", name: "Video game time (30 min)", cost: 30 },
  { icon: "📱", name: "Screen time (30 min)",      cost: 30 },
  { icon: "🍦", name: "Ice cream treat",            cost: 40 },
  { icon: "🕙", name: "Stay up 30 min late",        cost: 45 },
  { icon: "🏊", name: "Pool time",                  cost: 50 },
  { icon: "🎮", name: "Extra video game hour",      cost: 60 },
  { icon: "🍕", name: "Pick what's for dinner",     cost: 70 },
  { icon: "🎬", name: "Choose movie night film",    cost: 80 },
  { icon: "👫", name: "Friend playdate",            cost: 100 },
  { icon: "🧸", name: "Small toy",                  cost: 150 },
  { icon: "🎡", name: "Big day out / theme park",   cost: 300 },
];

/* ============================================================
   State
   ============================================================ */
let state = load();
let pickedAvatar = AVATARS[0];

function blankState() {
  return {
    children: [],
    chores: PRESET_CHORES.map((c) => ({ id: uid(), custom: false, ...c })),
    assignments: [], // { id, childId, choreId, choreName, points, done, doneAt }
    rewards: PRESET_REWARDS.map((r) => ({ id: uid(), custom: false, ...r })),
    redemptions: [], // { id, childId, childName, rewardName, icon, cost, at }
    bonusTasks: [], // { id, name, points, category, repeatable, done }
    bonusLog: [], // { id, taskId, name, points, childId, childName, at }
    parent: { name: "", avatar: PARENT_AVATARS[0], pass: null }, // parent profile + soft passkey hash
    onboarded: false, // has the parent completed (or skipped) first-run setup?
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    // basic shape guard
    if (!parsed.children || !parsed.chores || !parsed.assignments) return blankState();
    // migrate older saves that predate later features
    if (!parsed.rewards) parsed.rewards = PRESET_REWARDS.map((r) => ({ id: uid(), custom: false, ...r }));
    if (!parsed.redemptions) parsed.redemptions = [];
    if (!parsed.bonusTasks) parsed.bonusTasks = [];
    if (!parsed.bonusLog) parsed.bonusLog = [];
    // migrate the bare parentPass into a full parent profile
    if (!parsed.parent) {
      parsed.parent = { name: "", avatar: PARENT_AVATARS[0], pass: parsed.parentPass || null };
    }
    delete parsed.parentPass;
    // existing installs are treated as already onboarded so they aren't walled
    if (!("onboarded" in parsed)) parsed.onboarded = true;
    parsed.children.forEach((k) => {
      if (typeof k.spent !== "number") k.spent = 0;
      if (!("pass" in k)) k.pass = null; // soft hash of this child's passkey
    });
    return parsed;
  } catch (e) {
    console.warn("Could not load saved data, starting fresh.", e);
    return blankState();
  }
}

let storageWarned = false;
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // private/incognito mode or storage disabled — keep the app usable for this
    // session instead of throwing (which would otherwise trap the current action)
    console.warn("Could not persist data to localStorage.", e);
    if (!storageWarned) {
      storageWarned = true;
      toast("⚠️ Can't save on this device (private mode?). The app still works, but changes won't persist.");
    }
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ============================================================
   Helpers
   ============================================================ */
function getKid(id) { return state.children.find((k) => k.id === id); }
function getChore(id) { return state.chores.find((c) => c.id === id); }
function getReward(id) { return state.rewards.find((r) => r.id === id); }
function getBonus(id) { return state.bonusTasks.find((b) => b.id === id); }

/* ---- Soft passkey hashing ----
   This is a deterrent for a shared family device, NOT cryptographic security.
   A short non-reversible hash keeps the raw passkey out of localStorage. */
function hashPass(s) {
  let h = 5381;
  const str = "cq:" + String(s);
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return "h" + (h >>> 0).toString(36);
}
function checkPass(raw, hash) { return !!hash && hashPass(raw) === hash; }

/* Lifetime points (kid.points) drive badges/levels/milestones and never go
   down when spending. The spendable balance is what's left after redemptions. */
function balanceOf(kid) { return Math.max(0, (kid.points || 0) - (kid.spent || 0)); }

function categoriesDone(kid) {
  const cats = new Set(
    state.assignments
      .filter((a) => a.childId === kid.id && a.done)
      .map((a) => {
        const ch = getChore(a.choreId);
        return ch ? ch.category : a.category;
      })
  );
  // bonus work counts toward the All-Rounder badge too
  state.bonusLog
    .filter((l) => l.childId === kid.id)
    .forEach((l) => cats.add(l.category || "Bonus"));
  return cats.size;
}

function levelFor(points) {
  return Math.floor(points / 100) + 1;
}

function earnedBadges(kid) {
  return BADGES.filter((b) => b.test(kid));
}

/* ============================================================
   Sessions / passkey gate (soft lock for a shared device)
   ============================================================ */
const SESSION_KEY = "chorequest.session";
let session = loadSession();
let lockPickedChild = null;

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || { role: null, childId: null };
  } catch (e) {
    return { role: null, childId: null };
  }
}
function saveSession() {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
  catch (e) { console.warn("Could not persist session.", e); }
}

/* With no parent passkey set, the app is fully open (acts as parent).
   Once a passkey exists, you must sign in as parent or child. */
function effectiveRole() {
  if (!state.parent.pass) return "parent";
  if (session.role === "parent") return "parent";
  if (session.role === "child" && getKid(session.childId)) return "child";
  return "locked";
}

function signInParent(raw) {
  if (checkPass(raw, state.parent.pass)) {
    session = { role: "parent", childId: null };
    saveSession();
    toast("Welcome back! 👋");
    refresh();
    return true;
  }
  toast("Incorrect parent passkey");
  return false;
}

function signInChild(childId, raw) {
  const kid = getKid(childId);
  if (kid && checkPass(raw, kid.pass)) {
    session = { role: "child", childId };
    saveSession();
    toast(`Hi ${kid.name}! 🎉`);
    refresh();
    return true;
  }
  toast("Incorrect passkey");
  return false;
}

function signOut() {
  session = { role: null, childId: null };
  lockPickedChild = null;
  saveSession();
  refresh();
}

function lockApp() {
  if (!state.parent.pass) {
    toast("Set a parent passkey first");
    selectView("portal");
    return;
  }
  signOut();
}

/* ============================================================
   View switching (role-aware)
   ============================================================ */
const CHILD_VIEWS = ["mytasks", "scoreboard"];

function selectView(view) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
  if (view === "scoreboard") drawChart();
}

function ensureAllowedView(role) {
  const active = document.querySelector(".tab.active");
  let view = active ? active.dataset.view : null;
  if (role === "child") {
    if (!CHILD_VIEWS.includes(view)) view = "mytasks";
  } else {
    if (!view || view === "mytasks") view = "kids";
  }
  selectView(view);
}

function applyRole() {
  const onboard = document.getElementById("onboard-screen");
  const lock = document.getElementById("lock-screen");

  // First-run: parent must create their profile + passkey (or skip) before anything else
  if (!state.onboarded) {
    document.body.dataset.role = "onboarding";
    renderOnboarding();
    onboard.hidden = false;
    lock.hidden = true;
    return;
  }
  onboard.hidden = true;

  const role = effectiveRole();
  document.body.dataset.role = role;
  if (role === "locked") {
    renderLockScreen();
    lock.hidden = false;
    return;
  }
  lock.hidden = true;
  ensureAllowedView(role);
  renderSessionBar(role);
}

const tabs = document.getElementById("tabs");
tabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  selectView(btn.dataset.view);
  renderAll();
});

/* ---- Session bar ---- */
function renderSessionBar(role) {
  const bar = document.getElementById("session-bar");
  if (role === "child") {
    const k = getKid(session.childId);
    bar.innerHTML = `
      <span class="who">🙋 ${escapeHtml(k.name)} ${k.avatar}</span>
      <span class="sb-note">${balanceOf(k)} pts to spend · Level ${levelFor(k.points)}</span>
      <button class="sb-btn" id="signout-btn">Sign out</button>`;
    bar.querySelector("#signout-btn").addEventListener("click", signOut);
  } else if (state.parent.pass) {
    const pname = state.parent.name ? escapeHtml(state.parent.name) : "Parent";
    bar.innerHTML = `
      <span class="who">${state.parent.avatar || "👨‍👩‍👧"} ${pname}</span>
      <button class="sb-btn" id="lockbar-btn">🔒 Lock</button>`;
    bar.querySelector("#lockbar-btn").addEventListener("click", lockApp);
  } else {
    bar.innerHTML = `<span class="sb-note">🔓 No passkey set — set one in 🔐 Parent Portal to enable child sign-in.</span>`;
  }
}

/* ---- Lock screen ---- */
function renderLockScreen() {
  const pIn = document.getElementById("parent-pass-input");
  pIn.placeholder = state.parent.name ? `${state.parent.name}'s passkey` : "Parent passkey";

  const listEl = document.getElementById("kid-signin-list");
  const hint = document.getElementById("kid-signin-hint");
  const form = document.getElementById("kid-signin-form");
  const kidsWithPass = state.children.filter((k) => k.pass);
  if (kidsWithPass.length === 0) {
    listEl.innerHTML = "";
    form.hidden = true;
    hint.textContent = "No child passkeys yet — a parent can set them in the Parent Portal.";
    return;
  }
  hint.textContent = "Tap your name, then enter your passkey.";
  listEl.innerHTML = "";
  kidsWithPass.forEach((k) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "kid-pick" + (lockPickedChild === k.id ? " active" : "");
    b.innerHTML = `<span class="av">${k.avatar}</span>${escapeHtml(k.name)}`;
    b.addEventListener("click", () => {
      lockPickedChild = k.id;
      renderLockScreen();
      const inp = document.getElementById("kid-pass-input");
      inp.placeholder = `${k.name}'s passkey`;
      inp.value = "";
      inp.focus();
    });
    listEl.appendChild(b);
  });
  form.hidden = !lockPickedChild;
}

document.getElementById("parent-signin").addEventListener("submit", (e) => {
  e.preventDefault();
  const inp = document.getElementById("parent-pass-input");
  signInParent(inp.value);
  inp.value = "";
});

document.getElementById("kid-signin-form").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!lockPickedChild) return;
  const inp = document.getElementById("kid-pass-input");
  signInChild(lockPickedChild, inp.value);
  inp.value = "";
});

/* ============================================================
   FIRST-RUN ONBOARDING (parent profile + passkey)
   ============================================================ */
let onboardAvatar = PARENT_AVATARS[0];

function renderOnboarding() {
  buildAvatarPicker(document.getElementById("parent-avatar-picker"), PARENT_AVATARS, onboardAvatar, (a) => {
    onboardAvatar = a;
    renderOnboarding();
  });
}

function setOnboardError(msg, focusId) {
  const el = document.getElementById("onboard-error");
  el.textContent = msg || "";
  el.hidden = !msg;
  if (focusId) { const f = document.getElementById(focusId); if (f) f.focus(); }
}

document.getElementById("onboard-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("onboard-name").value.trim();
  const p1 = document.getElementById("onboard-pass").value;
  const p2 = document.getElementById("onboard-pass2").value;
  if (!name) { setOnboardError("Please enter your name.", "onboard-name"); return; }
  if (p1.length < 4) { setOnboardError("Passkey must be at least 4 characters.", "onboard-pass"); return; }
  if (p1 !== p2) { setOnboardError("The two passkeys don't match — please re-enter them.", "onboard-pass2"); return; }
  setOnboardError("");
  state.parent = { name, avatar: onboardAvatar, pass: hashPass(p1) };
  state.onboarded = true;
  session = { role: "parent", childId: null };
  saveSession();
  save();
  toast(`Welcome, ${name}! 👋 Now add your kids and give each a passkey.`);
  refresh();
});

document.getElementById("onboard-form").addEventListener("input", () => setOnboardError(""));

document.getElementById("onboard-skip").addEventListener("click", () => {
  state.onboarded = true; // explore in open mode; a passkey can be set later in the portal
  save();
  toast("You can set a parent passkey anytime in 🔐 Parent Portal.");
  refresh();
});

/* ============================================================
   KIDS
   ============================================================ */
/* Reusable avatar grid: renders `list` into `wrap`, marks `selected`,
   and calls `onPick(avatar)` when one is chosen. */
function buildAvatarPicker(wrap, list, selected, onPick) {
  wrap.innerHTML = "";
  list.forEach((a) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "avatar-opt" + (a === selected ? " selected" : "");
    b.textContent = a;
    b.addEventListener("click", () => onPick(a));
    wrap.appendChild(b);
  });
}

function renderAvatarPicker() {
  buildAvatarPicker(document.getElementById("avatar-picker"), AVATARS, pickedAvatar, (a) => {
    pickedAvatar = a;
    renderAvatarPicker();
  });
}

document.getElementById("kid-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("kid-name");
  const name = input.value.trim();
  if (!name) return;
  state.children.push({
    id: uid(),
    name,
    avatar: pickedAvatar,
    points: 0,
    completedCount: 0,
  });
  input.value = "";
  pickedAvatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  save();
  toast(`Welcome, ${name}! 🎉`);
  renderAll();
});

function renderKids() {
  const list = document.getElementById("kids-list");
  if (state.children.length === 0) {
    list.innerHTML = emptyState("👨‍👩‍👧‍👦", "No profiles yet", "Add your first child above to get started.");
    return;
  }
  list.innerHTML = "";
  state.children.forEach((k) => {
    const done = state.assignments.filter((a) => a.childId === k.id && a.done).length;
    const card = document.createElement("div");
    card.className = "kid-card";
    card.innerHTML = `
      <button class="remove-x" title="Remove">✕</button>
      <div class="avatar">${k.avatar}</div>
      <h3>${escapeHtml(k.name)}</h3>
      <div class="pts">${balanceOf(k)} pts to spend</div>
      <div class="sub">${k.points} earned · ${done} chore${done === 1 ? "" : "s"} done</div>
      <span class="level-pill">Level ${levelFor(k.points)}</span>
    `;
    card.querySelector(".remove-x").addEventListener("click", () => removeKid(k.id));
    list.appendChild(card);
  });
}

function removeKid(id) {
  const kid = getKid(id);
  if (!kid) return;
  if (!confirm(`Remove ${kid.name} and all of their assignments?`)) return;
  state.children = state.children.filter((k) => k.id !== id);
  state.assignments = state.assignments.filter((a) => a.childId !== id);
  save();
  renderAll();
}

/* ============================================================
   CHORES
   ============================================================ */
document.getElementById("chore-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const nameEl = document.getElementById("chore-name");
  const ptsEl = document.getElementById("chore-points");
  const catEl = document.getElementById("chore-category");
  const name = nameEl.value.trim();
  const points = Math.max(1, parseInt(ptsEl.value, 10) || 1);
  if (!name) return;
  state.chores.push({ id: uid(), name, points, category: catEl.value, custom: true });
  nameEl.value = "";
  ptsEl.value = 10;
  save();
  toast(`Added custom chore: ${name}`);
  renderChores();
  renderAssignControls();
});

document.getElementById("chore-search").addEventListener("input", renderChores);

function renderChores() {
  const list = document.getElementById("chores-list");
  const q = document.getElementById("chore-search").value.trim().toLowerCase();
  const filtered = state.chores.filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
  );
  if (filtered.length === 0) {
    list.innerHTML = emptyState("🧹", "No chores found", "Try a different search or add a custom chore.");
    return;
  }
  list.innerHTML = "";
  filtered.forEach((c) => {
    const item = document.createElement("div");
    item.className = "chore-item" + (c.custom ? " custom" : "");
    item.innerHTML = `
      <div>
        <div class="name">${escapeHtml(c.name)}</div>
        <div class="meta">${c.category}${c.custom ? " · custom" : ""}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <span class="badge-pts">${c.points} pts</span>
        ${c.custom ? '<button class="btn ghost danger tiny" data-del>Delete</button>' : ""}
      </div>
    `;
    const del = item.querySelector("[data-del]");
    if (del) del.addEventListener("click", () => deleteChore(c.id));
    list.appendChild(item);
  });
}

function deleteChore(id) {
  const ch = getChore(id);
  if (!ch) return;
  if (!confirm(`Delete custom chore "${ch.name}"? Existing assignments stay intact.`)) return;
  state.chores = state.chores.filter((c) => c.id !== id);
  save();
  renderChores();
  renderAssignControls();
}

/* ============================================================
   ASSIGNMENTS
   ============================================================ */
document.getElementById("assign-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const childId = document.getElementById("assign-kid").value;
  const choreId = document.getElementById("assign-chore").value;
  const kid = getKid(childId);
  const chore = getChore(choreId);
  if (!kid || !chore) return;
  state.assignments.push({
    id: uid(),
    childId,
    choreId,
    choreName: chore.name,
    category: chore.category,
    points: chore.points,
    done: false,
    doneAt: null,
  });
  save();
  toast(`Assigned "${chore.name}" to ${kid.name}`);
  renderAssignments();
});

function renderAssignControls() {
  const kidSel = document.getElementById("assign-kid");
  const choreSel = document.getElementById("assign-chore");
  kidSel.innerHTML = state.children.length
    ? state.children.map((k) => `<option value="${k.id}">${k.avatar} ${escapeHtml(k.name)}</option>`).join("")
    : `<option value="">Add a child first</option>`;
  choreSel.innerHTML = state.chores.length
    ? state.chores
        .map((c) => `<option value="${c.id}">${escapeHtml(c.name)} (${c.points} pts)</option>`)
        .join("")
    : `<option value="">No chores available</option>`;
}

function renderAssignments() {
  const board = document.getElementById("assign-board");
  if (state.children.length === 0) {
    board.innerHTML = emptyState("📋", "No one to assign to", "Add a child in the Kids tab first.");
    return;
  }
  board.innerHTML = "";
  state.children.forEach((k) => {
    const tasks = state.assignments.filter((a) => a.childId === k.id);
    const earned = tasks.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
    const col = document.createElement("div");
    col.className = "assign-col";
    col.innerHTML = `
      <h3><span>${k.avatar}</span> ${escapeHtml(k.name)} <span class="col-pts">${earned} pts earned</span></h3>
      <div class="tasks"></div>
    `;
    const tasksWrap = col.querySelector(".tasks");
    if (tasks.length === 0) {
      tasksWrap.innerHTML = `<p class="empty-note">No chores assigned yet.</p>`;
    } else {
      tasks.forEach((t) => {
        const row = document.createElement("div");
        row.className = "task" + (t.done ? " done" : "");
        row.innerHTML = `
          <input type="checkbox" ${t.done ? "checked" : ""} title="Mark complete" />
          <span class="t-name">${escapeHtml(t.choreName)}</span>
          <span class="t-pts">+${t.points}</span>
          <button class="x" title="Remove assignment">🗑</button>
        `;
        row.querySelector("input").addEventListener("change", (ev) => toggleTask(t.id, ev.target.checked));
        row.querySelector(".x").addEventListener("click", () => removeAssignment(t.id));
        tasksWrap.appendChild(row);
      });
    }
    board.appendChild(col);
  });
}

function toggleTask(id, done) {
  const a = state.assignments.find((x) => x.id === id);
  if (!a) return;
  const kid = getKid(a.childId);
  if (!kid) return;
  const wasDone = a.done;
  a.done = done;
  a.doneAt = done ? Date.now() : null;

  if (done && !wasDone) {
    const before = earnedBadges(kid).map((b) => b.id);
    kid.points += a.points;
    kid.completedCount += 1;
    save();
    const after = earnedBadges(kid);
    const newBadge = after.find((b) => !before.includes(b.id));
    if (newBadge) {
      celebrate(`${kid.name} earned the ${newBadge.icon} "${newBadge.name}" badge!`);
    } else {
      toast(`+${a.points} pts for ${kid.name}! 🎉`);
    }
  } else if (!done && wasDone) {
    kid.points = Math.max(0, kid.points - a.points);
    kid.completedCount = Math.max(0, kid.completedCount - 1);
    save();
  }
  refresh();
}

function removeAssignment(id) {
  const a = state.assignments.find((x) => x.id === id);
  if (!a) return;
  if (a.done) {
    const kid = getKid(a.childId);
    if (kid) {
      kid.points = Math.max(0, kid.points - a.points);
      kid.completedCount = Math.max(0, kid.completedCount - 1);
    }
  }
  state.assignments = state.assignments.filter((x) => x.id !== id);
  save();
  refresh();
}

/* ============================================================
   STORE / REDEMPTION
   ============================================================ */
document.getElementById("reward-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const iconEl = document.getElementById("reward-icon");
  const nameEl = document.getElementById("reward-name");
  const costEl = document.getElementById("reward-cost");
  const name = nameEl.value.trim();
  const cost = Math.max(1, parseInt(costEl.value, 10) || 1);
  if (!name) return;
  const icon = iconEl.value.trim() || "🎁";
  state.rewards.push({ id: uid(), name, cost, icon, custom: true });
  nameEl.value = "";
  iconEl.value = "🎁";
  costEl.value = 50;
  save();
  toast(`Added reward: ${name}`);
  renderStore();
});

function renderStore() {
  // balance chips
  const strip = document.getElementById("balance-strip");
  strip.innerHTML = state.children.length
    ? state.children
        .map(
          (k) =>
            `<div class="bal-chip"><span class="av">${k.avatar}</span>${escapeHtml(k.name)}: <span class="amt">${balanceOf(k)} pts</span></div>`
        )
        .join("")
    : `<p class="muted">Add children in the Kids tab to start redeeming rewards.</p>`;

  // reward cards
  const list = document.getElementById("rewards-list");
  if (state.rewards.length === 0) {
    list.innerHTML = emptyState("🎁", "No rewards yet", "Add a reward above to get started.");
  } else {
    const kidOptions = state.children
      .map((k) => `<option value="${k.id}">${k.avatar} ${escapeHtml(k.name)}</option>`)
      .join("");
    list.innerHTML = "";
    state.rewards
      .slice()
      .sort((a, b) => a.cost - b.cost)
      .forEach((r) => {
        const item = document.createElement("div");
        item.className = "reward-item" + (r.custom ? " custom" : "");
        item.innerHTML = `
          ${r.custom ? '<button class="reward-del" title="Delete reward">✕</button>' : ""}
          <div class="r-top">
            <span class="r-ico">${escapeHtml(r.icon)}</span>
            <span class="r-name">${escapeHtml(r.name)}</span>
            <span class="r-cost">${r.cost} pts</span>
          </div>
          <div class="r-redeem">
            ${
              state.children.length
                ? `<select>${kidOptions}</select><button class="btn good tiny" data-redeem>Redeem</button>`
                : `<span class="empty-note">Add a child to redeem</span>`
            }
          </div>
        `;
        const delBtn = item.querySelector(".reward-del");
        if (delBtn) delBtn.addEventListener("click", () => deleteReward(r.id));
        const redeemBtn = item.querySelector("[data-redeem]");
        if (redeemBtn) {
          const sel = item.querySelector("select");
          redeemBtn.addEventListener("click", () => redeem(sel.value, r.id));
        }
        list.appendChild(item);
      });
  }

  // redemption history
  const hist = document.getElementById("redemptions-list");
  if (state.redemptions.length === 0) {
    hist.innerHTML = `<p class="empty-note">No rewards redeemed yet.</p>`;
  } else {
    hist.innerHTML = state.redemptions
      .slice()
      .sort((a, b) => b.at - a.at)
      .slice(0, 20)
      .map(
        (rd) => `
        <div class="redemption-row">
          <span>${escapeHtml(rd.icon)}</span>
          <span><strong>${escapeHtml(rd.childName)}</strong> redeemed ${escapeHtml(rd.rewardName)}</span>
          <span class="cost">−${rd.cost} pts</span>
          <span class="when">${timeAgo(rd.at)}</span>
        </div>`
      )
      .join("");
  }
}

function redeem(childId, rewardId) {
  const kid = getKid(childId);
  const reward = getReward(rewardId);
  if (!kid || !reward) return;
  if (balanceOf(kid) < reward.cost) {
    toast(`${kid.name} needs ${reward.cost - balanceOf(kid)} more pts for "${reward.name}"`);
    return;
  }
  kid.spent = (kid.spent || 0) + reward.cost;
  state.redemptions.push({
    id: uid(),
    childId: kid.id,
    childName: kid.name,
    rewardName: reward.name,
    icon: reward.icon,
    cost: reward.cost,
    at: Date.now(),
  });
  save();
  celebrate(`${kid.name} redeemed ${reward.icon} "${reward.name}"!`);
  renderAll();
}

function deleteReward(id) {
  const r = getReward(id);
  if (!r) return;
  if (!confirm(`Delete custom reward "${r.name}"? Past redemptions stay in history.`)) return;
  state.rewards = state.rewards.filter((x) => x.id !== id);
  save();
  renderStore();
}

/* ============================================================
   BONUS TASKS (unassigned, claimable by any child)
   ============================================================ */
document.getElementById("bonus-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const nameEl = document.getElementById("bonus-name");
  const ptsEl = document.getElementById("bonus-points");
  const catEl = document.getElementById("bonus-category");
  const repEl = document.getElementById("bonus-repeat");
  const name = nameEl.value.trim();
  const points = Math.max(1, parseInt(ptsEl.value, 10) || 1);
  if (!name) return;
  state.bonusTasks.push({
    id: uid(),
    name,
    points,
    category: catEl.value,
    repeatable: repEl.checked,
    done: false,
  });
  nameEl.value = "";
  ptsEl.value = 25;
  repEl.checked = false;
  save();
  toast(`Added bonus task: ${name}`);
  renderBonus();
});

function openBonusTasks() {
  return state.bonusTasks.filter((b) => b.repeatable || !b.done);
}

/* Render the claimable bonus board into a given element.
   `childId` (optional) means render for a specific signed-in child:
   shows a one-tap Complete button instead of a child picker. */
function renderBonusBoard(el, childId) {
  const open = openBonusTasks();
  if (open.length === 0) {
    el.innerHTML = emptyState("🎯", "No bonus tasks", childId ? "Check back later for extra ways to earn!" : "Add a bonus task above for the kids to claim.");
    return;
  }
  const kidOptions = state.children
    .map((k) => `<option value="${k.id}">${k.avatar} ${escapeHtml(k.name)}</option>`)
    .join("");
  el.innerHTML = "";
  open.forEach((b) => {
    const item = document.createElement("div");
    item.className = "chore-item custom";
    let claimHtml;
    if (childId) {
      claimHtml = `<button class="btn good tiny" data-claim>Complete +${b.points}</button>`;
    } else if (state.children.length) {
      claimHtml = `<select>${kidOptions}</select><button class="btn good tiny" data-claim>Award</button>`;
    } else {
      claimHtml = `<span class="empty-note">Add a child first</span>`;
    }
    item.innerHTML = `
      <div>
        <div class="name">${escapeHtml(b.name)}</div>
        <div class="meta">${escapeHtml(b.category)}${b.repeatable ? "" : " · one-time"}</div>
      </div>
      <div class="bonus-claim">
        <span class="badge-pts">${b.points} pts</span>
        ${b.repeatable ? '<span class="repeat-pill">repeatable</span>' : ""}
        ${claimHtml}
        ${!childId && !b.done ? '<button class="btn ghost danger tiny" data-del>Delete</button>' : ""}
      </div>
    `;
    const claimBtn = item.querySelector("[data-claim]");
    if (claimBtn) {
      const sel = item.querySelector("select");
      claimBtn.addEventListener("click", () => completeBonus(b.id, childId || (sel && sel.value)));
    }
    const delBtn = item.querySelector("[data-del]");
    if (delBtn) delBtn.addEventListener("click", () => deleteBonus(b.id));
    el.appendChild(item);
  });
}

function renderBonus() {
  renderBonusBoard(document.getElementById("bonus-board"), null);

  const log = document.getElementById("bonus-log");
  if (state.bonusLog.length === 0) {
    log.innerHTML = `<p class="empty-note">No bonus work completed yet.</p>`;
  } else {
    log.innerHTML = state.bonusLog
      .slice()
      .sort((a, b) => b.at - a.at)
      .slice(0, 20)
      .map(
        (l) => `
        <div class="redemption-row">
          <span>🎯</span>
          <span><strong>${escapeHtml(l.childName)}</strong> completed ${escapeHtml(l.name)}</span>
          <span class="t-pts" style="color:var(--good);font-weight:700;">+${l.points} pts</span>
          <span class="when">${timeAgo(l.at)}</span>
        </div>`
      )
      .join("");
  }
}

function completeBonus(taskId, childId) {
  const task = getBonus(taskId);
  const kid = getKid(childId);
  if (!task || !kid) return;
  if (!task.repeatable && task.done) return;
  const before = earnedBadges(kid).map((b) => b.id);
  kid.points += task.points;
  kid.completedCount += 1;
  if (!task.repeatable) task.done = true;
  state.bonusLog.push({
    id: uid(),
    taskId: task.id,
    name: task.name,
    points: task.points,
    category: task.category,
    childId: kid.id,
    childName: kid.name,
    at: Date.now(),
  });
  save();
  const newBadge = earnedBadges(kid).find((b) => !before.includes(b.id));
  if (newBadge) celebrate(`${kid.name} earned the ${newBadge.icon} "${newBadge.name}" badge!`);
  else celebrate(`${kid.name} earned +${task.points} bonus pts! 🎯`);
  refresh();
}

function deleteBonus(id) {
  const b = getBonus(id);
  if (!b) return;
  if (!confirm(`Delete bonus task "${b.name}"? Completed history stays intact.`)) return;
  state.bonusTasks = state.bonusTasks.filter((x) => x.id !== id);
  save();
  renderBonus();
}

/* ============================================================
   PARENT PORTAL (passkeys)
   ============================================================ */
document.getElementById("parent-pass-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const inp = document.getElementById("parent-pass-new");
  const val = inp.value.trim();
  if (val.length < 4) { toast("Passkey must be at least 4 characters"); return; }
  state.parent.pass = hashPass(val);
  inp.value = "";
  // setting a passkey signs the current device in as parent
  session = { role: "parent", childId: null };
  saveSession();
  save();
  toast("Parent passkey saved 🔐");
  refresh();
});

document.getElementById("parent-pass-clear").addEventListener("click", () => {
  if (!state.parent.pass) { toast("No passkey set"); return; }
  if (!confirm("Remove the parent passkey? The app will no longer lock and child sign-in will be disabled.")) return;
  state.parent.pass = null;
  save();
  toast("Parent passkey removed");
  refresh();
});

document.getElementById("lock-now-btn").addEventListener("click", lockApp);

let portalParentAvatar = null;
document.getElementById("portal-parent-save").addEventListener("click", () => {
  const name = document.getElementById("portal-parent-name").value.trim();
  if (!name) { toast("Please enter a name"); return; }
  state.parent.name = name;
  if (portalParentAvatar) state.parent.avatar = portalParentAvatar;
  save();
  toast("Parent profile saved");
  refresh();
});

function renderPortal() {
  // parent profile editor
  if (portalParentAvatar === null) portalParentAvatar = state.parent.avatar || PARENT_AVATARS[0];
  const avWrap = document.getElementById("portal-parent-avatar");
  const pick = (a) => { portalParentAvatar = a; buildAvatarPicker(avWrap, PARENT_AVATARS, a, pick); };
  buildAvatarPicker(avWrap, PARENT_AVATARS, portalParentAvatar, pick);
  const nameInput = document.getElementById("portal-parent-name");
  if (document.activeElement !== nameInput) nameInput.value = state.parent.name || "";

  const status = document.getElementById("parent-pass-status");
  status.textContent = state.parent.pass
    ? "A parent passkey is set. The app locks when you choose Lock or reopen it."
    : "No parent passkey yet. Set one to lock parent controls and enable child sign-in.";

  const list = document.getElementById("child-pass-list");
  if (state.children.length === 0) {
    list.innerHTML = `<p class="empty-note">Add children in the Kids tab first.</p>`;
    return;
  }
  list.innerHTML = "";
  state.children.forEach((k) => {
    const row = document.createElement("div");
    row.className = "child-pass-row";
    row.innerHTML = `
      <span class="cp-name">${k.avatar} ${escapeHtml(k.name)}</span>
      <span class="cp-state ${k.pass ? "set" : "unset"}">${k.pass ? "passkey set" : "no passkey"}</span>
      <input type="password" inputmode="numeric" placeholder="Set passkey (4+)" autocomplete="off" />
      <button class="btn primary tiny" data-set>Save</button>
      ${k.pass ? '<button class="btn ghost danger tiny" data-clear>Clear</button>' : ""}
    `;
    const input = row.querySelector("input");
    row.querySelector("[data-set]").addEventListener("click", () => {
      const v = input.value.trim();
      if (v.length < 4) { toast("Passkey must be at least 4 characters"); return; }
      k.pass = hashPass(v);
      input.value = "";
      save();
      toast(`Passkey set for ${k.name}`);
      renderPortal();
    });
    const clearBtn = row.querySelector("[data-clear]");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      if (!confirm(`Clear ${k.name}'s passkey? They won't be able to sign in.`)) return;
      k.pass = null;
      save();
      renderPortal();
    });
    list.appendChild(row);
  });
}

/* ============================================================
   MY TASKS (child's focused view)
   ============================================================ */
function renderMyTasks() {
  const wrap = document.getElementById("mytasks-content");
  const kid = session.role === "child" ? getKid(session.childId) : null;
  if (!kid) {
    wrap.innerHTML = emptyState("🙋", "Not signed in", "Sign in as a kid to see your tasks.");
    return;
  }
  const tasks = state.assignments.filter((a) => a.childId === kid.id);
  const pending = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const earned = new Set(earnedBadges(kid).map((b) => b.id));

  wrap.innerHTML = `
    <div class="mytasks-hero">
      <span class="av">${kid.avatar}</span>
      <div>
        <h2>Hi, ${escapeHtml(kid.name)}!</h2>
        <div class="stats">
          <span><b>${balanceOf(kid)}</b> pts to spend</span>
          <span><b>${kid.points}</b> earned</span>
          <span>Level <b>${levelFor(kid.points)}</b></span>
          <span><b>${kid.completedCount}</b> done</span>
        </div>
      </div>
    </div>

    <div class="mt-block">
      <h3>📋 My chores</h3>
      <div class="card" id="mt-chores"></div>
    </div>

    <div class="mt-block">
      <h3>🎯 Bonus tasks — earn extra!</h3>
      <div class="chore-grid" id="mt-bonus"></div>
    </div>

    <div class="mt-block">
      <h3>🏅 My badges</h3>
      <div class="badges" id="mt-badges"></div>
    </div>
  `;

  // chores
  const choreWrap = wrap.querySelector("#mt-chores");
  if (tasks.length === 0) {
    choreWrap.innerHTML = `<p class="empty-note">No chores assigned yet. Check the bonus tasks below!</p>`;
  } else {
    [...pending, ...done].forEach((t) => {
      const row = document.createElement("div");
      row.className = "task" + (t.done ? " done" : "");
      row.innerHTML = `
        <input type="checkbox" ${t.done ? "checked" : ""} title="Mark complete" />
        <span class="t-name">${escapeHtml(t.choreName)}</span>
        <span class="t-pts">+${t.points}</span>
      `;
      row.querySelector("input").addEventListener("change", (ev) => toggleTask(t.id, ev.target.checked));
      choreWrap.appendChild(row);
    });
  }

  // bonus board (one-tap complete for this child)
  renderBonusBoard(wrap.querySelector("#mt-bonus"), kid.id);

  // badges
  const badgesWrap = wrap.querySelector("#mt-badges");
  BADGES.forEach((b) => {
    const el = document.createElement("div");
    el.className = "badge" + (earned.has(b.id) ? " earned" : "");
    el.title = b.name;
    el.innerHTML = `<span class="ico">${b.icon}</span><span class="name">${b.name}</span>`;
    badgesWrap.appendChild(el);
  });
}

/* ============================================================
   SCOREBOARD
   ============================================================ */
function renderScoreboard() {
  const stat = document.getElementById("stat-row");
  const totalPts = state.children.reduce((s, k) => s + k.points, 0);
  const totalDone = state.assignments.filter((a) => a.done).length;
  const totalSpent = state.children.reduce((s, k) => s + (k.spent || 0), 0);
  const leader = [...state.children].sort((a, b) => b.points - a.points)[0];

  stat.innerHTML = `
    ${statBox(totalPts, "Total points earned")}
    ${statBox(totalDone, "Chores completed")}
    ${statBox(totalSpent, "Points redeemed")}
    ${statBox(leader ? `${leader.avatar}` : "—", leader ? `Leader: ${escapeHtml(leader.name)}` : "No leader yet")}
  `;

  drawChart();

  const grid = document.getElementById("scoreboard-grid");
  if (state.children.length === 0) {
    grid.innerHTML = emptyState("📊", "Nothing to score yet", "Add children and complete chores to fill the board.");
    return;
  }
  const ranked = [...state.children].sort((a, b) => b.points - a.points);
  grid.innerHTML = "";
  ranked.forEach((k, i) => {
    const rankMedal = ["🥇", "🥈", "🥉"][i] || `#${i + 1}`;
    const nextMs = MILESTONES.find((m) => m.points > k.points);
    const prevTarget = nextMs ? nextMs.points : MILESTONES[MILESTONES.length - 1].points;
    const pct = Math.min(100, Math.round((k.points / prevTarget) * 100));

    const card = document.createElement("div");
    card.className = "score-card";
    card.innerHTML = `
      <div class="sc-head">
        <span class="avatar">${k.avatar}</span>
        <div>
          <h3>${escapeHtml(k.name)}</h3>
          <div class="sc-points">${k.points} earned · ${balanceOf(k)} to spend · Level ${levelFor(k.points)}</div>
        </div>
        <span class="rank">${rankMedal}</span>
      </div>
      <div class="milestone">
        <div class="ms-top">
          <span>${nextMs ? "Next: " + nextMs.label : "Max milestone reached! 🎉"}</span>
          <span>${nextMs ? k.points + " / " + nextMs.points : ""}</span>
        </div>
        <div class="progress"><span style="width:${pct}%"></span></div>
      </div>
      <div class="badges"></div>
    `;
    const badgesWrap = card.querySelector(".badges");
    const earned = new Set(earnedBadges(k).map((b) => b.id));
    BADGES.forEach((b) => {
      const el = document.createElement("div");
      el.className = "badge" + (earned.has(b.id) ? " earned" : "");
      el.title = b.name;
      el.innerHTML = `<span class="ico">${b.icon}</span><span class="name">${b.name}</span>`;
      badgesWrap.appendChild(el);
    });
    grid.appendChild(card);
  });
}

function statBox(num, lbl) {
  return `<div class="stat"><div class="num">${num}</div><div class="lbl">${lbl}</div></div>`;
}

/* ---- Canvas bar chart (no external libs) ---- */
function drawChart() {
  const canvas = document.getElementById("score-chart");
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth || 600;
  const cssH = 260;
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const kids = [...state.children].sort((a, b) => b.points - a.points);
  if (kids.length === 0) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Add children and complete chores to see the chart.", cssW / 2, cssH / 2);
    return;
  }

  const padL = 40, padR = 20, padT = 20, padB = 46;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;
  const maxPts = Math.max(10, ...kids.map((k) => k.points));
  const niceMax = Math.ceil(maxPts / 10) * 10;

  // gridlines + y labels
  ctx.strokeStyle = "#e2e8f0";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px Segoe UI, sans-serif";
  ctx.textAlign = "right";
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((niceMax / steps) * i);
    const y = padT + plotH - (plotH * i) / steps;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(cssW - padR, y);
    ctx.stroke();
    ctx.fillText(val, padL - 6, y + 4);
  }

  const n = kids.length;
  const gap = plotW / n;
  const barW = Math.min(70, gap * 0.6);
  const colors = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#84cc16"];

  kids.forEach((k, i) => {
    const x = padL + gap * i + (gap - barW) / 2;
    const h = (k.points / niceMax) * plotH;
    const y = padT + plotH - h;
    ctx.fillStyle = colors[i % colors.length];
    roundRect(ctx, x, y, barW, h, 6);
    ctx.fill();

    // value
    ctx.fillStyle = "#1e293b";
    ctx.font = "bold 12px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(k.points, x + barW / 2, y - 6);

    // label
    ctx.fillStyle = "#475569";
    ctx.font = "12px Segoe UI, sans-serif";
    const label = `${k.avatar} ${k.name}`;
    ctx.fillText(trim(ctx, label, gap - 4), x + barW / 2, cssH - padB + 18);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  if (h < 1) h = 1;
  r = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function trim(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

/* ============================================================
   Utilities: toast, escape, empty states
   ============================================================ */
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function celebrate(msg) {
  toast("🎊 " + msg);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function emptyState(big, title, sub) {
  return `<div class="empty-state"><div class="big">${big}</div><h3>${title}</h3><p class="muted">${sub}</p></div>`;
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "yesterday" : `${d}d ago`;
}

/* ============================================================
   Reset
   ============================================================ */
document.getElementById("reset-btn").addEventListener("click", () => {
  if (!confirm("This erases ALL profiles, chores, scores, passkeys, and bonus tasks on this device. Continue?")) return;
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  state = blankState();
  session = { role: null, childId: null };
  lockPickedChild = null;
  onboardAvatar = PARENT_AVATARS[0];
  portalParentAvatar = null;
  pickedAvatar = AVATARS[0];
  save();
  toast("All data reset.");
  refresh();
});

/* ============================================================
   Render orchestration
   ============================================================ */
function renderAll() {
  renderKids();
  renderChores();
  renderAssignControls();
  renderAssignments();
  renderBonus();
  renderStore();
  renderPortal();
  renderMyTasks();
  renderScoreboard();
}

/* Re-render content, then apply the role gate (visibility, lock screen,
   session bar). Used after any action that can change auth or points. */
function refresh() {
  renderAll();
  applyRole();
}

window.addEventListener("resize", () => {
  if (document.getElementById("view-scoreboard").classList.contains("active")) drawChart();
});

// init
pickedAvatar = AVATARS[0];
renderAvatarPicker();
refresh();
