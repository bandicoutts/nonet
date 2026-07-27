# Copy

Transcribed from `Nonet.dc.html`. Dynamic values shown as `{placeholders}`. No emoji, no exclamation marks anywhere in the product. Mono kickers are uppercased by `text-transform` unless noted.

## Global chrome

| Key | String |
|---|---|
| wordmark | NONET |
| nav | Today · Archive · Record |
| theme toggle | Dark (shown while light is active) / Light (shown while dark is active) |
| auth chip, guest | Sign in |
| auth chip, signed in | AL |
| menu trigger | Menu |
| offline banner | Offline — your puzzle is saved here and will sync when you reconnect |
| footer | © 2026 Nonet |
| footer links | Settings · About · How to play |

### Mobile drawer
| Key | String |
|---|---|
| close | Close |
| primary nav | Today · Archive · Record |
| secondary nav | Settings · How to play · About |
| theme section | Theme |
| theme options | Light · Dark · System |
| account section | Account |
| account, guest action | Sign in |
| account, guest note | Progress is kept in this browser only. |
| account, signed in | Alex Lindqvist / alex@example.com |
| account, signed in action | Sign out |
| footer | © 2026 Nonet |

**Unrendered.** `headerKicker` is computed for every route (Settings, How to play, About, Tokens, Focus states, Sign in, Puzzle unavailable, Not found, Daily sudoku) and never placed in the template. Either wire it or drop it.

## Home

| Key | String |
|---|---|
| kicker, default | Sunday 26 July 2026 |
| kicker, solved | Solved · Sunday 26 July 2026 |
| hero | No. / 1247 |
| plate caption | Nonet No. 1247 — Hard |
| plate meta | 30 givens, 51 open cells / Daily edition, 26 July 2026 |

### State: ready (unplayed) and first visit
| Key | String |
|---|---|
| difficulty | Hard |
| meta | 30 givens · median 7:41 · one solution |
| primary action | Enter the puzzle → |
| status | Unopened |

### State: in progress
| Key | String |
|---|---|
| difficulty | Hard |
| meta | {placed} of 81 placed · 1 mistake |
| primary action | Resume · {time} → |
| status | Saved in this browser |

### State: solved
| Key | String |
|---|---|
| kicker | Solved today |
| stat labels | Time · Streak · Next puzzle |
| stat values | 07:12 · {streak} · 14:22:06 |
| primary action | Practice a hard one |
| secondary action | Replay, unscored |

### State: failed
| Key | String |
|---|---|
| kicker | Three mistakes — puzzle locked |
| body | You can start today's puzzle again from scratch. Finish before midnight and the run stays intact, though the solve will be marked a second attempt. |
| primary action | Start again |
| status | The run is held until midnight |

### Streak band (all states except first visit)
| Key | String |
|---|---|
| label | Consecutive days |
| value | {streak} |
| meta | best {best} · {solved} solved |
| sparkline caption | Last 30 days |

### State: first visit
| Key | String |
|---|---|
| invite | Solve today's puzzle to start a run. One a day, no catching up. |

### Practice section
| Key | String |
|---|---|
| section kicker | Practice — unlimited |
| resume strip | Unfinished practice puzzle — Medium, {placed} of 81 placed |
| resume action | Resume · {time} → |
| rows | Easy — 38 givens · 3:20 / Medium — 34 givens · 5:05 / Hard — 30 givens · 7:41 / Expert — 24 givens · 14:12 |
| row arrow | → |

### Practice-abandon confirmation
| Key | String |
|---|---|
| kicker | Practice in progress |
| body | Medium · 22 of 81 placed · 03:41. Starting {difficulty} discards it — practice puzzles are not kept. |
| primary action | Discard and start |
| secondary action | Keep playing |

## Board

| Key | String |
|---|---|
| back, daily or practice | Today |
| back, from archive | Archive |
| kicker, daily | Daily edition · 26 July 2026 |
| kicker, practice | Practice · unscored |
| kicker, replay | Replay · unscored |
| title, daily | No. 1247 — Hard |
| title, practice | Practice — {difficulty} |
| title, replay | Replay No. 1247 — Hard |
| selection, cell mode | Cell {A1} selected |
| selection, none | No cell selected |
| selection, digit loaded | Digit {d} loaded — tap cells to place |
| selection, digit loaded + notes | Digit {d} loaded — tap cells to note |
| selection, erase loaded | Erase loaded — tap cells to clear |
| mistakes | {n}/3 · Mistakes |
| input pair | Cell → digit / Digit → cells |
| caption, cell mode | Pick a cell, then pick its digit |
| caption, digit mode | Pick a digit, then tap every cell that takes it |
| toolbar | Notes · Undo · Redo · Erase · Hint · {hints} · Pause |
| toolbar, 390 | Notes · Undo · Redo · Hint {hints} · Pause · Erase |
| pad key count | {remaining} |
| pad key, held | NOTE (authored uppercase, no transform) |
| status | {placed} of 81 placed · autosaved |
| legend, desktop | Given bold · yours in blue · notes small |
| legend, tablet | Given bold · yours in blue · notes small · figure under each key is what remains |

### Keyboard legend (rail, desktop only)
1–9 Place · ⇧1–9 Note · Space Notes mode · ⌘Z / ⌘⇧Z Undo, redo · Del Erase · H Hint · P Pause

### State: paused
| Key | String |
|---|---|
| veil kicker | Paused at {time} |
| action | Resume |

### State: locked (three mistakes)
| Key | String |
|---|---|
| veil kicker | Three mistakes — locked |
| body, 1440 and 834 | Start the same puzzle again from scratch. Solve it before midnight and your run continues. |
| body, 390 | Start again from scratch. Solve before midnight and your run continues. |
| action | Start again |

### State: resumed notice
| Key | String |
|---|---|
| body, 1440 and 834 | Resumed from your other device — {placed} of 81 placed, timer at {time}. |
| body, 390 | Resumed from your other device — {placed} of 81 placed. |
| dismiss | Dismiss |

### State: first-run offer
| Key | String |
|---|---|
| body, 1440 and 834 | First time here? Read how Nonet works — it takes a minute. |
| body, 390 | First time here? Read how Nonet works. |
| link | Read how Nonet works |
| dismiss | Dismiss |

### Hint confirmation
| Key | String |
|---|---|
| kicker | Use a hint |
| body | A hint fills the selected cell with its answer. It marks this solve assisted and gives up today's percentile. Your run is not affected, and two further hints stay available. |
| primary action | Use a hint |
| secondary action | Not yet |

## Solved

| Key | String |
|---|---|
| header kicker | No. 1247 · 26 July 2026 |
| kicker | Complete |
| headline | Solved in / {time} |
| run label | Run extended |
| run value | {from} → {to} |
| run meta | Longest run {best} / Come back tomorrow — next puzzle in 14:22:06 |
| plate caption | Nonet No. 1247 — Hard |
| plate meta | Solved 26 July 2026 · 51 cells entered |
| stat labels | Time · Difficulty · Mistakes · Percentile |
| stat labels, assisted / second / unchecked | Time · Difficulty · Mistakes · Ranked |
| stat values, standard | 07:12 · Hard · 1 of 3 · Top 22% |
| stat values, other variants | 07:12 · Hard · 0 of 3 · No |
| primary action | Share result ↗ |
| secondary action | Practice another |
| share caption | This is exactly what gets copied — no grid, no spoilers. |
| toast | Copied |

### Variant notes
| Variant | String |
|---|---|
| standard | (none) |
| assisted | Assisted — one or more hints used. No percentile for assisted solves. |
| second attempt | Second attempt — the run holds, but this solve is not ranked. |
| unchecked | Unchecked — you played with checking off, so mistakes were not tracked. |

### Share text (three lines, copied verbatim)
```
NONET No. {no} · {difficulty}
{time} · {n} mistake · top {percentile}%
nonet.app
```
As rendered: `NONET No. 1247 · Hard` / `07:12 · 1 mistake · top 22%` / `nonet.app`. The mistake count is not pluralised — a 2-mistake solve would read "2 mistake". **Defect.**

## Archive

| Key | String |
|---|---|
| kicker | Archive |
| headline | Every edition since No. 1. |
| body | All free, all playable. Archive solves are recorded, but only today's puzzle can extend a run. |
| filter groups | Difficulty · Status |
| difficulty chips | Easy · Medium · Hard · Expert |
| status chips | Unplayed · Solved · Failed |
| filter count | {matched} of {total} in {Month} |
| clear | Clear all |
| month label | {Month} {Year} |
| jump label | Jump to |
| jump options | {Month} {Year} (February 2023 through July 2026) |
| weekday heads | M T W T F S S |
| mini-calendar note (390) | Month at a glance — pick an edition from the list below |
| legend | Solved · Failed · Unplayed · Today |
| edition count | {count} editions · No. 1 was 26 February 2023 |
| difficulty key | E easy · M medium · H hard · EX expert |
| rail note | Days that do not match stay in place, dimmed, so the month keeps its shape. |
| list heading | {Month} {Year} — {total} editions |
| list heading, 390 | {total} editions |
| list column heads | Date · Difficulty · Status (heads are computed but only Status renders) |
| list row | {d Mon yyyy} · No. {no} · {difficulty} · {status} · {time} |
| list row, 390 | {d Mon yyyy} · No. {no} · {difficulty} · {status} |
| status values | Solved · Failed · Unplayed · Today |
| time, unsolved | — |
| hidden rows | {n} more in this month do not match the filter |
| empty | Nothing in this month matches the filter. Try another month, or clear it. |

## Record

| Key | String |
|---|---|
| kicker | Record |
| headline | {Words} days, unbroken. |
| headline, no history | No record yet. |
| window tabs | All time · Last 30 days |
| guest note | These figures are stored in this browser only. Sign in if you would like them kept. |
| empty body | Nothing recorded yet. Solve today's puzzle and this page starts filling in. |
| empty action | Go to today's puzzle |
| stat labels | Current streak · Best streak · Dailies solved · Mistake-free |
| stat values, all time | {run} · {best} · {solved} · 68% |
| stat values, last 30 days | {streak} · {best30} · {solved30} · 72% |
| strip heading | Completion — {year} |
| year label | Year |
| year chips | 2023 · 2024 · 2025 · 2026 |
| strip hint (390) | Scroll the strip for the full year → |
| strip summary | {solved} solved · {failed} failed · {missed} unplayed |
| table one heading | Dailies by difficulty — all time |
| table one heads | Best · Median · Solved |
| table one rows | Easy 2:04 3:11 · Medium 3:38 4:52 · Hard 5:12 7:03 · Expert 9:48 13:26 (solve counts derived) |
| hint rate | Hints used, all time / 0.4 per puzzle |
| table two heading | Practice — all time |
| table two heads | Played · Median |
| table two rows | Easy 140 2:58 · Medium 96 4:40 · Hard 61 6:52 · Expert 12 12:31 |
| table two note | Practice never affects the streak or the daily percentile. |

## Settings

| Key | String |
|---|---|
| kicker | Settings |
| headline | How you play. |
| body | Every change applies to the next cell you touch. Nothing here is hidden behind a second screen. |
| note | Settings are kept in this browser. Sign in and they follow you, along with the streak. |
| Theme | Light, dark, or whatever the system is doing. — Light · Dark · System |
| Input | Cell → digit: pick a cell, then its digit. Digit → cells: pick a digit once, then tap every cell that takes it. — Cell → digit · Digit → cells |
| Auto-advance | After a digit is placed, move to the next empty cell in reading order. Cell first only. — Advance |
| Checking | Flag a wrong digit the moment it is entered, and count it. Off means no flags, no mistake tally, and no percentile. — Checking |
| Highlight matching digits | Shade every cell holding the same digit as the selected cell. — Matching |
| Highlight row, column and box | Shade the three units the selected cell belongs to. — Units |
| Show timer | Hide it while you play; the time is still recorded and shown at the end. — Timer |
| account section | Account |

### Account, guest
Playing as a guest / Progress is kept in this browser only. / Sign in

### Account, signed in
alex@example.com / Streak and stats sync across your devices. / Display name / Alex Lindqvist / Save / Shown on shared results. Two to twenty-four characters. / Sign out / Today's puzzle stays in this browser.

## Auth

### State: form
| Key | String |
|---|---|
| headline | Sign in |
| body | We send a link, you click it. No password to forget. Your streak and stats then follow you between devices. |
| field label | Email |
| placeholder | you@example.com |
| action | Send the link |
| note | You can keep playing as a guest — progress is saved in this browser either way. |

### State: link sent
| Key | String |
|---|---|
| headline | Check your email |
| body | A sign-in link is on its way to {email}. It expires in fifteen minutes. |
| action | I clicked the link |
| links | Send again · Keep playing as a guest |

### State: merged
| Key | String |
|---|---|
| kicker | Signed in |
| headline | Your history came across. |
| body | Nothing was lost. Completed solves from this browser and from the account are now one record; where both held the same day, the account's solve stands. |
| rows | Solves from this browser — 212 — 19 already on the account / Added to the account — 193 dailies / On the account now — {239 or 543} dailies / Run after merge — {18 or 41} days / Puzzle in progress — No. 1247, kept from {this browser or your phone} — {time} |
| note, run held here | On the nineteen shared days the account's solve was kept — the times differ, the day does not. The 18-day run held here is longer than the 5 days on the account, so it stands. |
| note, account ahead | On the nineteen shared days the account's solve was kept. Its run of 41 days is longer than the 18 days held here, so that run stands. |
| action | Continue |

## How to play

| Key | String |
|---|---|
| kicker | How to play |
| headline | Fill every row, column and box with 1 to 9. |
| body | No digit repeats in a row, a column, or a heavy-ruled 3×3 box. Every Nonet puzzle has exactly one solution and can be solved by reasoning alone — you never need to guess. |
| action | Start today's puzzle |

**Reading the grid** — A given. Bold, black, fixed. / Yours. Lighter weight, in blue. / A pencil mark. Small and grey. / Wrong, when checking is on.

**Playing** — Two ways in. Cell → digit: pick a cell, then its digit. Digit → cells: pick a digit once, then tap every cell that takes it. Switch on the board or in Settings. / Hold a pad key to write that digit as a pencil mark. The Notes toggle stays for a run of them; placing a digit clears it from the notes it rules out. / A digit with all nine placed is spent — its key is struck through and stops responding. / With a digit loaded, repeated wrong taps of that same digit cost one mistake, not three. The key turns red until you change digit or clear the error. / Three mistakes lock the puzzle. Three hints per puzzle, each marking the solve assisted.

**Keyboard** — 1–9 Place in the selected cell / ⇧1–9 Note, staying in placement / Space Notes mode / Del Erase / ⌘Z / ⌘⇧Z Undo, redo / H Hint / P Pause

**The daily** — One puzzle a day, the same for everyone, published at 00:05 UTC. / Difficulty follows the week: easy on Monday, expert on Saturday. / Solve it on the day to extend your run. Practice and archive puzzles do not count.

## About

| Key | String |
|---|---|
| kicker | About |
| headline | A nonet is a set of nine. |
| body 1 | Nine rows, nine columns, nine boxes. One puzzle a day, set by hand and checked by machine, published at 00:05 UTC and gone by midnight — plus as much practice as you want, whenever you want it. |
| body 2 | No advertising, no notifications, no confetti. The grid is the interface; everything else stays out of the way. |
| Typeface | Archivo, IBM Plex Mono |
| Puzzles | Generated and verified for a single solution |
| First edition | No. 1 · 26 February 2023 |
| Contact | hello@nonet.app |

## Puzzle unavailable

| Key | String |
|---|---|
| kicker | Puzzle unavailable |
| body | Today's edition did not load. Nothing you did — try again in a moment. |
| action | Try again |
| reference | ERR · EDITION 1247 · 00:05 UTC (authored uppercase, no transform) |

## Not found

| Key | String |
|---|---|
| numeral | 404 |
| body | There is no puzzle at this address. |
| action | Today's puzzle |

## Reference screens (internal, not shipped)

### Tokens
Kicker Tokens. Headline "Every value, named once." Body "This sheet is the authority. Where an inline value in the product disagrees with a token here, the token wins." Section heads Colour / Type / Space / Motion with right-aligned notes "Light and dark, side by side", "Archivo and IBM Plex Mono", "One scale, plus layout constants", "Four durations, nothing else". Column heads Token / Light / Dark / Role. Sub-heads "Contrast — text on ground", "Layout constants". Contrast note "Both roles clear AA at every size they are used, in both themes." Motion note "Under prefers-reduced-motion: reduce every duration in the product collapses to 1ms. No transform survives; only colour and opacity change, and they change at once."

### Focus states
Kicker Focus states. Headline "The ring is ink. Selection is cobalt." Body "Focus and selection coexist on the grid, so they never share a colour. Focus is a 2px ink ring with a 2px ground-coloured gap — drawn outside the element everywhere except grid cells, where cells meet edge to edge and the ring is drawn inside instead." Specimen labels focus / focus + selected / selected; group heads Grid cell, Pad key · toolbar chip, Back control · chip pair · month selector, Nav link · settings control · primary button. Tab order table 01–10 with "Shift-Tab reverses it. The dev switcher above the frame sits outside the tab order entirely." Dialog note "A confirmation takes focus on its first action — USE A HINT, DISCARD AND START. TAB is trapped inside it, ESC is the second action, and focus returns to the control that opened it. The 390 menu behaves the same way: focus lands on its first item, TAB cycles within it, ESC closes it and returns focus to MENU."

### Dev switcher
NONET · STATE SWITCHER, REFERENCE, and the screen / state / viewport chip labels. Harness only.

## Voice audit

- No emoji and no exclamation marks anywhere. Compliant.
- Mono kickers are uppercase and tracked. Compliant, except `NOTE` on a held pad key and `ERR · EDITION 1247 · 00:05 UTC` on the error screen, which are authored uppercase with no `text-transform` — the same result, an inconsistent method.
- Sentence case everywhere else. Compliant. `Top 22%` and `No` as stat values are sentence case by accident of being single words.
- Numbers are tabular wherever they are a figure. Compliant on timers, streaks, edition numbers, cell digits and all table columns; `body` and `body-small` strings that contain figures inline (for example "41 of 81 placed · 1 mistake") are **not** tabular.
- Mistake count in the share text is not pluralised.
