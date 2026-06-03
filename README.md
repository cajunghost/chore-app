# 🏆 ChoreQuest

A gamified, **100% local** family chore tracker. Parents add each child to a
profile on their own device, assign chores, and watch the kids earn points,
badges, and milestone rewards on a live scoreboard.

> **Privacy first:** All data lives in your browser's `localStorage`. Nothing is
> ever sent to a server or saved in any external database.

## Features

- **Local family profiles** — add each child with a name and avatar. Data stays
  on the device.
- **Chore library** — 18 pre-loaded ("pre-canned") chores plus the ability to
  add your own custom chores with points and a category.
- **Assign & complete** — assign any chore to any child and check it off to earn
  points. Un-checking or removing a completed chore correctly refunds points.
- **Gamification**
  - Points per chore
  - Levels (every 100 points)
  - Eight unlockable **badges** (first chore, point thresholds, all-rounder…)
  - Reward **milestones** with progress bars (Movie Night, Ice Cream, etc.)
- **Reward store** — kids spend earned points on real rewards. Ships with 12
  pre-canned rewards (video game time, pool time, extra TV/screen time, movie
  night pick, days out…) and lets parents add custom rewards with their own
  icon and point cost. Redeeming deducts from a child's **spendable balance**
  while their **lifetime earned** points (and the badges/levels/milestones they
  drive) stay intact. A redemption history shows recent spends.
- **Bonus tasks** — parents post *unassigned* extra jobs (one-time or
  repeatable) on a Bonus board, separate from assigned chores. Any child can
  claim them for bonus points; a log tracks who completed what.
- **Link a child's device (no cloud)** — a child can use ChoreQuest on their own
  phone or tablet. In the Parent Portal the parent taps **Create family link** to
  get a shareable link, code, **or QR code** and sends/shows it to the child. On
  the child's device they open the link (or paste the code / scan the QR on the
  **Join** screen) and unlock it with the **parent's name + passkey**. The whole
  family copies over directly — parent → child, nothing stored online.
- **Progress sync-back (child → parent)** — after doing chores on their own
  device, the child taps **“Create my progress code”** in My Tasks to get a code
  (or QR). The parent pastes it (or opens/scans it) under **Receive a child's
  progress** in the Parent Portal to merge the child's points, completions, and
  redemptions into the master copy. Merging recomputes from authoritative records,
  so applying the same code twice never double-counts. Still 100% local — the
  code/QR carries the data directly, nothing is stored online.

> QR codes are generated locally with a vendored, dependency-free library
> (`qrcode.js`); no network or external service is used. Very large families may
> exceed QR capacity, in which case the app falls back to the link/code.
- **Parent Portal + passkeys** — edit the parent profile, manage the parent
  passkey (which locks the parent-only tabs: Kids, Chores, Assignments, Bonus,
  Store, Portal), and give each child their own passkey. On the shared family
  device, a child signs in with their token to a focused **“My Tasks”** view
  showing their chores, the bonus board, their stats, and badges — and can check
  off work to earn points. *(This is a soft lock for a shared device, not
  cryptographic security; passkeys are stored only as a non-reversible local
  hash and never leave the browser.)*
- **Live scoreboard** — summary stats, a ranked leaderboard, and a custom-drawn
  bar chart of points by child that updates in real time.

## Running it

No build step, no dependencies, no network needed. Just open the app:

```bash
# from the project folder
open index.html        # macOS
xdg-open index.html    # Linux
# or simply double-click index.html

# (optional) serve it locally
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Project structure

| File         | Purpose                                              |
|--------------|------------------------------------------------------|
| `index.html` | App shell, tabbed layout, forms                      |
| `styles.css` | Styling and responsive layout                        |
| `app.js`     | State, persistence (localStorage), rendering, chart  |

## Data & reset

State is stored under the `chorequest.v1` key in `localStorage`. Use the
**Reset all data** button in the footer to wipe everything on the device.
