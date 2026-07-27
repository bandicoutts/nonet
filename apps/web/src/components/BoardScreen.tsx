'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apply, createSession, generatePuzzle } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { BoardLayout } from './BoardLayout';
import { HintConfirm } from './HintConfirm';
import { resume, save } from '@/lib/autosave';
import { canRetry, currentAttempt, recordFailure } from '@/lib/puzzles';
import { DEFAULT_SETTINGS, readSettings } from '@/lib/settings';
import { appendSolve, clearAutosave, localDate } from '@/lib/storage';
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
}: {
  readonly puzzleRef: PuzzleRef;
  /** Where a finished puzzle goes. Injected so the dwell is testable. */
  readonly onSolved?: (ref: PuzzleRef) => void;
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

  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsed] = useState(0);
  const [confirmingHint, setConfirmingHint] = useState(false);

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
    if (saved === null) {
      setSession(configured);
      return;
    }

    setSession(saved.session);
    setElapsed(saved.elapsedMs);
    // Once, for this puzzle. `ref` is derived from props that do not change
    // while a board is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (paused || session.status !== 'playing') return;
    const id = setInterval(() => setElapsed((ms) => ms + 1000), 1000);
    return () => clearInterval(id);
  }, [paused, session.status]);

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
  const latest = useRef({ session, elapsedMs });
  latest.current = { session, elapsedMs };

  useEffect(() => {
    if (!restored.current || session.status !== 'playing') return;
    save(ref, session, latest.current.elapsedMs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (paused || session.status !== 'playing') return;
    const id = setInterval(() => {
      save(ref, latest.current.session, latest.current.elapsedMs);
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
      recordFailure(ref);
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
      durationMs: latest.current.elapsedMs,
      mistakes: session.mistakes,
      usedHint: session.assisted,
      // Solving a retry before local midnight keeps the streak, marked second
      // attempt, with no percentile (GAME-RULES.md).
      attempt: currentAttempt(ref),
      checked: session.checking,
      kind: ref.kind === 'daily' ? 'daily' : 'practice',
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

  return (
    <>
      <BoardLayout
        session={session}
        onAction={dispatch}
        elapsedMs={elapsedMs}
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
