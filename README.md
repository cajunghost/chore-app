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
- **First-run parent setup** — on a fresh device the app opens a welcome screen
  where the parent creates their **profile** (name + avatar) and a **parent
  passkey** before anything else. (You can skip to explore, then set it up later
  in the Parent Portal.)
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
