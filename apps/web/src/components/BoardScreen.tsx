'use client';

import { useEffect, useReducer, useState } from 'react';
import Link from 'next/link';
import { apply, createSession, generatePuzzle } from '@nonet/engine';
import type { Action, Difficulty, SessionState } from '@nonet/engine';
import { BoardLayout } from './BoardLayout';
import { HintConfirm } from './HintConfirm';

/**
 * The playable board.
 *
 * The puzzle comes from a fixed seed for now — the daily edge function and
 * localStorage resume are the next two items in Phase 3, and both slot in where
 * `generatePuzzle` is called. Everything below that line is final: the session
 * reducer is the engine's, so no rule is reimplemented here.
 */
export function BoardScreen({
  difficulty = 'medium',
  seed = 20260727,
}: {
  difficulty?: Difficulty;
  seed?: number;
}) {
  const [puzzle] = useState(() => generatePuzzle(difficulty, seed));
  const [session, dispatch] = useReducer(
    (state: SessionState, action: Action) => apply(state, action),
    puzzle,
    (p) => createSession({ givens: p.givens, solution: p.solution }),
  );

  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsed] = useState(0);
  const [confirmingHint, setConfirmingHint] = useState(false);

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

  return (
    <>
      <BoardLayout
        session={session}
        onAction={dispatch}
        elapsedMs={elapsedMs}
        paused={paused}
        onPause={() => setPaused(true)}
        onResume={() => setPaused(false)}
        onRetry={() => window.location.reload()}
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
