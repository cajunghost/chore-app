/* ============================================================
   ChoreQuest — 100% client-side family chore tracker
   All data is persisted to localStorage. Nothing is sent
   to any server or external database.
   ============================================================ */

const STORAGE_KEY = "chorequest.v1";
const AVATARS = ["🦄", "🐯", "🐱", "🐶", "🦊", "🐸", "🐵", "🐼", "🦁", "🐲", "🦖", "🚀", "⚽", "🎸", "🌟", "🦋"];

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
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    // basic shape guard
    if (!parsed.children || !parsed.chores || !parsed.assignments) return blankState();
    return parsed;
  } catch (e) {
    console.warn("Could not load saved data, starting fresh.", e);
    return blankState();
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ============================================================
   Helpers
   ============================================================ */
function getKid(id) { return state.children.find((k) => k.id === id); }
function getChore(id) { return state.chores.find((c) => c.id === id); }

function categoriesDone(kid) {
  const cats = new Set(
    state.assignments
      .filter((a) => a.childId === kid.id && a.done)
      .map((a) => {
        const ch = getChore(a.choreId);
        return ch ? ch.category : a.category;
      })
  );
  return cats.size;
}

function levelFor(points) {
  return Math.floor(points / 100) + 1;
}

function earnedBadges(kid) {
  return BADGES.filter((b) => b.test(kid));
}

/* ============================================================
   View switching
   ============================================================ */
const tabs = document.getElementById("tabs");
tabs.addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("view-" + btn.dataset.view).classList.add("active");
  renderAll();
});

/* ============================================================
   KIDS
   ============================================================ */
function renderAvatarPicker() {
  const wrap = document.getElementById("avatar-picker");
  wrap.innerHTML = "";
  AVATARS.forEach((a) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "avatar-opt" + (a === pickedAvatar ? " selected" : "");
    b.textContent = a;
    b.addEventListener("click", () => {
      pickedAvatar = a;
      renderAvatarPicker();
    });
    wrap.appendChild(b);
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
      <div class="pts">${k.points} pts</div>
      <div class="sub">${done} chore${done === 1 ? "" : "s"} completed</div>
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
  renderAssignments();
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
  renderAssignments();
}

/* ============================================================
   SCOREBOARD
   ============================================================ */
function renderScoreboard() {
  const stat = document.getElementById("stat-row");
  const totalPts = state.children.reduce((s, k) => s + k.points, 0);
  const totalDone = state.assignments.filter((a) => a.done).length;
  const totalPending = state.assignments.filter((a) => !a.done).length;
  const leader = [...state.children].sort((a, b) => b.points - a.points)[0];

  stat.innerHTML = `
    ${statBox(totalPts, "Total points earned")}
    ${statBox(totalDone, "Chores completed")}
    ${statBox(totalPending, "Chores pending")}
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
          <div class="sc-points">${k.points} pts · Level ${levelFor(k.points)} · ${k.completedCount} done</div>
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

/* ============================================================
   Reset
   ============================================================ */
document.getElementById("reset-btn").addEventListener("click", () => {
  if (!confirm("This erases ALL profiles, chores, and scores on this device. Continue?")) return;
  localStorage.removeItem(STORAGE_KEY);
  state = blankState();
  save();
  toast("All data reset.");
  renderAll();
});

/* ============================================================
   Render orchestration
   ============================================================ */
function renderAll() {
  renderKids();
  renderChores();
  renderAssignControls();
  renderAssignments();
  renderScoreboard();
}

window.addEventListener("resize", () => {
  if (document.getElementById("view-scoreboard").classList.contains("active")) drawChart();
});

// init
pickedAvatar = AVATARS[0];
renderAvatarPicker();
renderAll();
