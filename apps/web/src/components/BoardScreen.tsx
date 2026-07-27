'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apply, createSession, generatePuzzle } from '@nonet/engine';
import type { Action, Difficulty, SessionState } from '@nonet/engine';
import { BoardLayout } from './BoardLayout';
import { HintConfirm } from './HintConfirm';
import { resume, save } from '@/lib/autosave';
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
export function BoardScreen({
  difficulty = 'medium',
  seed = 20260727,
  kind = 'practice',
}: {
  difficulty?: Difficulty;
  seed?: number;
  kind?: PuzzleRef['kind'];
}) {
  const [puzzle] = useState(() => generatePuzzle(difficulty, seed));
  const ref: PuzzleRef = { kind, difficulty, seed };

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

    setSession((fresh) => {
      const saved = resume(ref, fresh);
      if (saved === null) return fresh;
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
    if (session.status !== 'solved' || recorded.current) return;
    recorded.current = true;

    appendSolve({
      ref,
      solvedAt: new Date().toISOString(),
      // The device's own day, which is what a streak counts (NONET-9).
      localDate: localDate(),
      durationMs: latest.current.elapsedMs,
      mistakes: session.mistakes,
      usedHint: session.assisted,
      attempt: 1,
      checked: session.checking,
      kind: kind === 'daily' ? 'daily' : 'practice',
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
        onRetry={() => {
          // A retry starts the same puzzle from scratch, so the saved board is
          // gone rather than resumed into on the next load.
          clearAutosave(ref);
          window.location.reload();
        }}
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
