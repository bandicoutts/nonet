# Full-surface design brief (Claude Design handoff)

The brief given to Claude Design on 2026-07-26 for the complete v1 web surface. **Historical — reproduced as sent.** The approved prototype (home light/dark, board mid-solve, solved) was the style source of truth.

> **Superseded in part by DECISIONS.md NONET-2 (2026-07-27).** Where this brief and NONET-2 disagree, NONET-2 wins. Notable deltas after eight review passes:
> - **Practice is no longer a screen.** No `/practice` route; the picker, resume and abandon confirm are sections of Home. Nav is Today · Archive · Record.
> - **Board input gained a second mode** (digit-first) plus long-press notes, `Shift`+digit, spent pad keys and optional auto-advance. Digit-first has its own mistake-containment rule.
> - **The first hint per puzzle confirms.**
> - **`CLOSE` became a contextual back control** (`← TODAY` / `← ARCHIVE`).
> - **Archive and Record stopped sharing a calendar** — Record is a year heat strip, Archive a filterable month grid.
> - **New surfaces:** mobile drawer (<768px), post-sign-in merge summary, hint confirmation, Tokens screen, Focus-states screen.
>
> For the current screen and state inventory, read the prototype's own state switcher; for the rules, read GAME-RULES.md.

---

NONET — full web surface build-out

The design direction is locked: the existing prototype (home light/dark, board mid-solve, solved state) is the source of truth for style. This pass is about SURFACE, not style — build out every page, state, and viewport of the v1 web product. Do not redesign the wordmark, palette (bone/graphite + cobalt), type system (grotesque sans + mono kickers), grid conventions (givens bold black · user entries cobalt · notes small), or the hairline-rule layout language. Extend them.

Viewports: design every screen at desktop (~1440), tablet (~834, iPad portrait), and mobile browser (~390). On mobile, the board screen is the one to fully re-think, not shrink: number pad in thumb reach at the bottom, toolbar reachable, grid maximized; ≥44px touch targets everywhere.

## Answers to your questions

1. **Scope & tech** — Build a front-end with mocked data; it will be wired to Next.js + Supabase afterwards, so keep data access cleanly separated (a single mock data module). You own the markup and components; define design tokens in one place — they become the token package. Desktop, tablet, and mobile all land in this pass. SSR-friendly markup; no PWA/offline in v1.

2. **Accounts & persistence** — Anyone can play instantly as a guest (localStorage). Signing in (email magic link; minimal on-brand auth screen) syncs across devices. Design signed-out AND signed-in variants of Home and Record; signed-out Record shows real local stats plus one quiet line offering sign-in — never a gate. In-progress puzzles autosave continuously and resume exactly. Cross-device: server wins for completed solves; most recent autosave wins for in-progress — design a small "resumed from your other device" notice, not a conflict dialog. First-run: no forced onboarding; first board visit shows a dismissable one-time "How to play" offer.

3. **The daily puzzle** — One puzzle per day, same grid for everyone, published 00:05 UTC; the solved-screen countdown targets the next publish. Difficulty follows a weekly rhythm (Mon Easy · Tue–Wed Medium · Thu–Fri Hard · Sat Expert · Sun Hard). A finished daily can be replayed, unscored, labeled "replay". The Archive lists all past dailies, free, playable; archive solves record stats but never extend the streak. Streak days are the player's LOCAL calendar day. Failure: at 3/3 mistakes the board locks into a failed state; the player may retry from scratch (fresh timer, mistakes reset). Solving before local midnight keeps the streak, marked "second attempt", no percentile.

4. **Practice mode** — Pre-built bank per difficulty (mock: endless). Practice results live in their own Record section, never touch streaks or percentiles. One in-flight practice puzzle at a time: starting a new one prompts to abandon; unfinished practice resumes from Home/Practice. Difficulty is engine-defined; the UI shows only label, givens count, and median time.

5. **Board interaction** — Click/tap select + type; full arrow-key navigation; keyboard-only play must be complete. Keys: 1–9 place (or note when notes on), Space toggles notes, Backspace/Delete erases, Ctrl/Cmd+Z undo, +Shift redo, P pause, H hint. No drag-select. Selecting highlights row/column/box; any cell with a digit also highlights matching digits — both are settings, default on. Givens are selectable for highlighting, inert to editing. Notes manual-only in v1; placing a digit auto-clears that digit from notes in the same row/column/box. Erase clears the entry, else the notes. Undo unlimited (covers notes/erases), with redo; undo never changes the mistake count.

6. **Correctness & mistakes** — Auto-check ON by default: wrong digits flag immediately — error cell state (error red digit + subtle tint + a NON-COLOR cue such as a thin underline) persists until corrected; each wrong entry counts once toward 3/3. A "Checking: on/off" setting turns it off: nothing flagged, no tally, mistakes indicator hidden; result labeled "unchecked", no mistakes stat, no percentile.

7. **Hints** — 3 per puzzle (HINT · 3 counts down). A hint fills the selected cell (else the easiest unfilled cell) with the correct digit, brief placement animation. Hints never break the streak but mark the solve "assisted": shown on the result, no percentile. Design the 0-hints disabled state.

8. **Timer, streaks, stats** — Explicit pause veils the grid (opaque plate, no free thinking time); tab blur auto-pauses. A setting hides the timer during play (time still recorded). Timer layout holds at 60:00+, capped display 99:59+. Streaks: consecutive local days, no freeze, no grace, practice never counts. Record page: current/best streak, dailies solved, completion calendar (month grid: solved/failed/missed), per-difficulty best & median times, mistake-free rate, hint usage, separate practice section; windows all-time + last 30 days. Percentile compares first-attempt, unassisted, checked solves of that day's puzzle; anything else omits it. No leaderboards/social in v1.

9. **Sharing** — Spoiler-free text: `NONET No. 1247 · Hard` / `7:12 · 1 mistake · top 22%` / `nonet.app`. Clipboard (quiet "Copied" confirmation) + native share sheet. No generated image in v1.

10. **Settings & accessibility** — Settings: Theme (Light/Dark/System) · Checking on/off · Highlight matching digits · Highlight row/column/box · Show timer · Account (sign in, display name, sign out). No sound in v1. Accessibility is a requirement: complete keyboard-only play; ARIA grid semantics; WCAG AA everywhere (including cobalt-as-text); focus states distinct from selection; prefers-reduced-motion honored. Preserve non-color redundancy (bold-vs-regular for given-vs-yours; underline cue for errors). No separate zoom mode — responsive grid + browser zoom must hold.

11. **Content & copy** — You write the microcopy. Voice: precise, calm, editorial; dry wit in small doses; never chirpy. No exclamation marks, no emoji. Mono kickers UPPERCASE TRACKED; otherwise sentence case. Numbers always tabular. Also design: How to play (rules + Nonet conventions; linked from nav/footer, and the one-time first-run offer) and a one-screen About/colophon. Footer: © line, About, How to play.

12. **Empty, error & edge states** — First-ever visit (no streak band, empty Record, one line of copy, no zero-state cheerleading); daily already solved (Home hero becomes result summary + countdown + replay/practice paths); daily failed (retry available / locked); resume states for daily and practice ("Resume · 7:12"); offline (quiet banner, puzzle stays playable from autosave); puzzle failed to load (mono error + retry, no illustration clichés); synced-elsewhere notice; 404 (one line, link home); long values (99:59+ times, 365+ streaks, 1000+ archive) must not break layouts.

13. **Phasing** — Everything above is v1. Explicitly v2, design NOTHING: leaderboards/social, auto-candidate notes, generated share images, PWA/offline install, streak freezes, sound.

## Screen inventory

Each at all three viewports, light + dark (dark is a designed sibling theme, not an inversion — including secondary pages):

1. Home — signed-out first visit / signed-in with streak / daily-solved / daily-failed / resume-in-progress
2. Board — daily mid-solve / notes-mode active / error cell / paused (veiled) / failed-locked / practice variant
3. Solved — base plus assisted / second-attempt / unchecked variants (stat row adapts)
4. Practice — difficulty picker + resume state
5. Archive — browsable list/calendar of past dailies (solved/failed/missed/unplayed), archive puzzle entry point
6. Record — signed-in full stats / signed-out local stats + sign-in line / empty first-visit
7. Auth — sign in (magic link) / check-your-email state
8. Settings — as specified in (10)
9. How to play + About
10. States — offline banner, load error, 404, share "Copied" moment

Build it as one navigable front-end with mocked data, not static frames — every state reachable (a small dev state-switcher is fine).
