'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apply, createSession, generatePuzzle } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { BoardLayout } from './BoardLayout';
import { HintConfirm } from './HintConfirm';
import { resume, save } from '@/lib/autosave';
import { canRetry, currentAttempt, recordFailure } from '@/lib/puzzles';
import { readSettings } from '@/lib/settings';
import { appendSolve, clearAutosave, localDate } from '@/lib/storage';
import type { PuzzleRef } from '@/lib/storage';

/** How often the clock alone is worth a write, in milliseconds. */
const TIMER_SAVE_MS = 10_000;

/**
 * The playable board.
 *
 * The puzzle comes from a fixed seed for now — the daily edge function is the
 * next item, and it slots in where `generatePuzzle` is called. Everything below
 * that line is final: the session reducer is the engine's, so no rule is
 * reimplemented here.
 */
export function BoardScreen({ puzzleRef }: { puzzleRef: PuzzleRef }) {
  const ref = puzzleRef;
  const [puzzle] = useState(() => generatePuzzle(ref.difficulty, ref.seed));

  const [session, setSession] = useState<SessionState>(() =>
    createSession({ givens: puzzle.givens, solution: puzzle.solution }),
  );

  const dispatch = useCallback((action: Action) => {
    setSession((state) => apply(state, action));
  }, []);

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

    setSession((fresh) => {
      const configured = apply(
        apply(fresh, { type: 'setMode', mode: settings.inputMode }),
        { type: 'selectCell', cell: null },
      );
      const withChecking =
        settings.checking === configured.checking
          ? configured
          : createSession({
              givens: fresh.givens,
              solution: fresh.solution,
              mode: settings.inputMode,
              checking: settings.checking,
            });

      const saved = resume(ref, withChecking);
      if (saved === null) return withChecking;
      setElapsed(saved.elapsedMs);
      return saved.session;
    });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status]);

  return (
    <>
      <BoardLayout
        session={session}
        onAction={dispatch}
        elapsedMs={elapsedMs}
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
