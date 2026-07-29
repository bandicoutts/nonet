'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apply, createSession, generatePuzzle } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { BoardLayout } from './BoardLayout';
import { FirstRunNotice, ResumedNotice } from './BoardNotice';
import { ElapsedReadout } from './ElapsedTime';
import { HintConfirm } from './HintConfirm';
import { resume, save } from '@/lib/autosave';
import { createElapsedClock } from '@/lib/elapsed';
import { canRetry, currentAttempt, dailyRef, recordFailure } from '@/lib/puzzles';
import { DEFAULT_SETTINGS, readSettings } from '@/lib/settings';
import {
  appendSolve,
  clearAutosave,
  listAutosaves,
  localDate,
  readSolves,
  takeResumedElsewhere,
} from '@/lib/storage';
import type { PuzzleRef } from '@/lib/storage';

/** How often the clock alone is worth a write, in milliseconds. */
const TIMER_SAVE_MS = 10_000;

/**
 * How long the completed grid stays on screen before the result replaces it.
 *
 * Long enough that the last digit lands and the finished board is actually
 * seen, short enough that it does not read as the app having stalled. Skipped
 * entirely under `prefers-reduced-motion`, where the product's rule is that a
 * duration collapses rather than shortens.
 *
 * Exported for the tests; no other module imports it.
 */
export const SOLVED_DWELL_MS = 1200;

/**
 * The playable board.
 *
 * The puzzle comes from a fixed seed for now — the daily edge function is the
 * next item, and it slots in where `generatePuzzle` is called. Everything below
 * that line is final: the session reducer is the engine's, so no rule is
 * reimplemented here.
 */
export function BoardScreen({
  puzzleRef,
  onSolved,
  replay = false,
}: {
  readonly puzzleRef: PuzzleRef;
  /** Where a finished puzzle goes. Injected so the dwell is testable. */
  readonly onSolved?: (ref: PuzzleRef) => void;
  /**
   * A replay of a puzzle already finished. **Unscored, in both directions.**
   *
   * It records `kind: 'replay'`, which every streak and percentile reader
   * already filters out — and it costs nothing when it goes wrong: no attempt
   * is spent and no failure is recorded, because the daily's single retry
   * belongs to the day it was for, not to someone revisiting it (NONET-32).
   */
  readonly replay?: boolean;
}) {
  const ref = puzzleRef;
  const [puzzle] = useState(() => generatePuzzle(ref.difficulty, ref.seed));

  const [session, setSession] = useState<SessionState>(() =>
    createSession({ givens: puzzle.givens, solution: puzzle.solution }),
  );

  const dispatch = useCallback((action: Action) => {
    setSession((state) => apply(state, action));
  }, []);

  /*
   * The display settings, read alongside the session.
   *
   * Kept in state rather than read at render time because there is no
   * localStorage on the server, and held here rather than passed down from a
   * page because the board is the only thing that consumes them.
   */
  const [display, setDisplay] = useState({
    showTimer: DEFAULT_SETTINGS.showTimer,
    highlightMatching: DEFAULT_SETTINGS.highlightMatching,
    highlightUnits: DEFAULT_SETTINGS.highlightUnits,
  });

  /*
   * The two inline notices, both decided once on mount.
   *
   * `first-run` is for a player with no history at all, and dismissing it is
   * remembered — an offer to read the rules that reappears every visit stops
   * reading as an offer. `resumed` can only be known from a marker the sign-in
   * merge left behind (NONET-34), and reading it consumes it.
   */
  const [notice, setNotice] = useState<'none' | 'first-run' | 'resumed'>('none');

  const [paused, setPaused] = useState(false);
  const [confirmingHint, setConfirmingHint] = useState(false);

  /**
   * The clock, deliberately not `useState`.
   *
   * As state it re-rendered this component every second, and through it the
   * layout, the board and all 81 cells — a full board rebuild per second on a
   * board nobody had touched. The store keeps the value outside React: this
   * component reads it with `clock.get()` when it needs a number to save or to
   * record, and the only thing that re-renders on the tick is the readout leaf.
   *
   * Held in `useState` purely for a stable identity across renders; it is never
   * set again.
   */
  const [clock] = useState(createElapsedClock);

  /**
   * Resume happens in an effect, not in the initial state.
   *
   * A client component is still server-rendered for the first HTML, and there
   * is no `localStorage` there. The seed makes the givens identical on both
   * sides, so what the player sees before this runs is the right puzzle with
   * their own entries not yet filled in — rather than a hydration mismatch.
   */
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    // Settings are read here for the same reason: there is no localStorage on
    // the server, and the board's input mode and checking come from them.
    const settings = readSettings();
    setDisplay({
      showTimer: settings.showTimer,
      highlightMatching: settings.highlightMatching,
      highlightUnits: settings.highlightUnits,
    });

    /*
     * Built outside `setSession`, deliberately.
     *
     * This was written as a functional update with `setElapsed` called inside
     * the updater, and it cost a player's clock. An updater must be pure:
     * StrictMode invokes it twice and React discards the nested update, so the
     * restored time never reached state — and the autosave effect then wrote
     * the board straight back out with `elapsedMs: 0`, destroying the saved
     * time rather than merely mis-displaying it. It passed jsdom, which does
     * not run StrictMode unless asked, and was obvious on screen: a board saved
     * at 7:11 came back reading 0:05.
     *
     * `createSession` is pure and the puzzle is already in hand, so there is
     * nothing the updater form was buying.
     */
    const configured = createSession({
      givens: puzzle.givens,
      solution: puzzle.solution,
      mode: settings.inputMode,
      checking: settings.checking,
      autoAdvance: settings.autoAdvance,
    });

    const saved = resume(ref, configured);

    if (takeResumedElsewhere(ref) && saved !== null) setNotice('resumed');
    else if (isFirstRun()) setNotice('first-run');

    if (saved === null) {
      setSession(configured);
      return;
    }

    /*
     * The clock first, then the board — for reading order, not for correctness.
     *
     * An earlier comment here claimed the order was load-bearing. It is not,
     * and the claim was checked rather than trusted: both statements are
     * synchronous within one effect body, so React has not re-rendered between
     * them, and the autosave effect that reads `clock.get()` runs after both.
     * Swapping them passes every test in the suite.
     *
     * What *is* load-bearing is that the clock is set from outside a state
     * updater, and `clock-restores.test.tsx` enforces that by asserting on the
     * first write rather than on the order of these two lines. The original bug
     * put `setElapsed` inside the `setSession` updater, where StrictMode's
     * double invocation made React discard it — and the autosave then wrote the
     * board back out with `elapsedMs: 0`, destroying a real time rather than
     * merely displaying the wrong one.
     */
    clock.set(saved.elapsedMs);
    setSession(saved.session);
    // Once, for this puzzle. `ref` is derived from props that do not change
    // while a board is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused || session.status !== 'playing') return;
    // Unchanged in every respect but where the number lands: pausing still
    // stops it, and so does a board that is no longer playing.
    const id = setInterval(() => clock.advance(1000), 1000);
    return () => clearInterval(id);
  }, [clock, paused, session.status]);

  // Tab blur auto-pauses (GAME-RULES.md). The timer records real time spent, so
  // a player who looks away is not charged for it.
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => document.removeEventListener('visibilitychange', onHidden);
  }, []);

  /**
   * Autosave.
   *
   * Written on every change to the board, which is what "resume exactly on
   * reopen" needs, and again on a slow interval so a long think is not lost —
   * the clock moves every second, and a write per second would be a hundred
   * times the traffic for the same guarantee.
   */
  const latest = useRef(session);
  latest.current = session;

  useEffect(() => {
    if (!restored.current || session.status !== 'playing') return;
    save(ref, session, clock.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (paused || session.status !== 'playing') return;
    const id = setInterval(() => {
      save(ref, latest.current, clock.get());
    }, TIMER_SAVE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, session.status]);

  /**
   * A finished puzzle is recorded once and stops being resumable.
   *
   * The guard is a ref rather than the status alone because React runs effects
   * twice in development, and a solve counted twice is a solve the player did
   * not earn.
   */
  const recorded = useRef(false);
  useEffect(() => {
    if (recorded.current) return;

    /*
     * A locked board spends an attempt.
     *
     * Recorded here rather than on the retry, because the attempt is spent the
     * moment the third mistake lands — a player who closes the tab on a locked
     * board has still used it. No `solves` row: a failed board is not a solve,
     * and inventing one would put a run in the stats that never finished.
     */
    if (session.status === 'failed') {
      recorded.current = true;
      // A replay costs nothing. Spending the daily's retry here would let a
      // player lose an attempt at a puzzle they had already finished.
      if (!replay) recordFailure(ref);
      clearAutosave(ref);
      return;
    }

    if (session.status !== 'solved') return;
    recorded.current = true;

    appendSolve({
      ref,
      solvedAt: new Date().toISOString(),
      // The device's own day, which is what a streak counts (NONET-9).
      localDate: localDate(),
      durationMs: clock.get(),
      mistakes: session.mistakes,
      usedHint: session.assisted,
      // Solving a retry before local midnight keeps the streak, marked second
      // attempt, with no percentile (GAME-RULES.md).
      attempt: currentAttempt(ref),
      checked: session.checking,
      /*
       * An old edition is an *archive* solve, not a daily one.
       *
       * Only today's edition can extend a run (GAME-RULES.md), and every
       * consumer of the streak filters on `kind === 'daily'` — so getting this
       * wrong here is the whole rule. It became reachable when `/board` started
       * taking a ref from the URL (NONET-23): before that the only daily it
       * could load was today's. Recording an old edition as `daily` would stamp
       * it with *today's* local date and hand out a streak day for a puzzle
       * that was not today's.
       */
      kind: replay ? 'replay' : ref.kind === 'practice' ? 'practice' : editionKind(ref),
    });

    clearAutosave(ref);

    /*
     * And then the result, which is the whole point of having finished.
     *
     * After the solve is written, never before: the result screen reads it back
     * out of storage, so navigating first would arrive at a screen with nothing
     * to describe and bounce the player home.
     */
    const dwell = prefersReducedMotion() ? 0 : SOLVED_DWELL_MS;
    if (dwell === 0) onSolved?.(ref);
    else leaving.current = setTimeout(() => onSolved?.(ref), dwell);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  // A player who leaves during the dwell — the back control, or a reload — must
  // not be pulled to the result a second later.
  const leaving = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (leaving.current !== null) clearTimeout(leaving.current);
  }, []);

  const placed = 81 - session.grid.filter((cell) => cell === 0).length;

  return (
    <>
      {notice === 'first-run' ? (
        <FirstRunNotice onDismiss={() => { dismissFirstRun(); setNotice('none'); }} />
      ) : null}
      {notice === 'resumed' ? (
        <ResumedNotice
          placed={placed}
          // A reading leaf rather than a formatted string: the notice used to
          // re-render every second along with everything else, and its time
          // ticked up while it was on screen. It still does — the subscription
          // just sits in the leaf now, so the notice itself is not on the tick.
          time={<ElapsedReadout clock={clock} />}
          onDismiss={() => setNotice('none')}
        />
      ) : null}

      <BoardLayout
        session={session}
        onAction={dispatch}
        clock={clock}
        showTimer={display.showTimer}
        highlightMatching={display.highlightMatching}
        highlightUnits={display.highlightUnits}
        paused={paused}
        onPause={() => setPaused(true)}
        onResume={() => setPaused(false)}
        // There is no third attempt. When the retry is spent the prop is
        // absent, so the veil keeps its message and loses its action rather
        // than offering a control that would do nothing.
        {...(canRetry(ref)
          ? {
              onRetry: () => {
                // A retry starts the same puzzle from scratch, so the saved
                // board is gone rather than resumed into on the next load.
                clearAutosave(ref);
                window.location.reload();
              },
            }
          : {})}
        onConfirmHint={() => setConfirmingHint(true)}
        back={
          /* Labelled for its origin, never "close" — the puzzle is autosaved
             and nothing is discarded (NONET-2). */
          <Link
            href="/"
            className="type-control flex min-h-(--tap-target-min) items-center text-fg2 no-underline hover:text-fg"
          >
            &larr; Today
          </Link>
        }
      />

      {confirmingHint ? (
        <HintConfirm
          onUse={() => {
            dispatch({ type: 'hint' });
            setConfirmingHint(false);
          }}
          onDismiss={() => setConfirmingHint(false)}
        />
      ) : null}
    </>
  );
}

const FIRST_RUN_KEY = 'nonet:seen-intro';

/** A player with no history at all — never solved, never saved a board. */
function isFirstRun(): boolean {
  try {
    if (window.localStorage.getItem(FIRST_RUN_KEY) !== null) return false;
  } catch {
    return false;
  }
  return readSolves().length === 0 && listAutosaves().length === 0;
}

function dismissFirstRun(): void {
  try {
    window.localStorage.setItem(FIRST_RUN_KEY, '1');
  } catch {
    // A player who cannot persist sees the offer again. Harmless.
  }
}

/**
 * Whether a daily ref is *today's* edition or one from the archive.
 *
 * By seed, because the seed is derived from the date and therefore **is** the
 * edition (NONET-16) — comparing dates would mean deciding which timezone's
 * date, which the publish gate has already answered.
 */
function editionKind(ref: PuzzleRef): 'daily' | 'archive' {
  return ref.seed === dailyRef().seed ? 'daily' : 'archive';
}

/**
 * Whether the player has asked for no motion.
 *
 * Guarded because `matchMedia` does not exist under the server render or in
 * every test environment, and a missing media query must not be read as a
 * preference either way.
 */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
