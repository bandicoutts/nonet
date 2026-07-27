/**
 * Component harness. Not the product — a place to look at and play the board
 * before the Next.js app shell arrives in Phase 3.
 */
import { StrictMode, useEffect, useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { apply, createSession, generatePuzzle } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { BoardLayout } from '../components/BoardLayout';
import { TokenStyles } from '../components/TokenStyles';
import './harness.css';

const puzzle = generatePuzzle('medium', 20260727);

function Harness() {
  const [session, dispatch] = useReducer(
    (state: SessionState, action: Action) => apply(state, action),
    createSession({ givens: puzzle.givens, solution: puzzle.solution }),
  );
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsed] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (paused || session.status !== 'playing') return;
    const id = setInterval(() => setElapsed((ms) => ms + 1000), 1000);
    return () => clearInterval(id);
  }, [paused, session.status]);

  return (
    <div className="harness">
      <TokenStyles />

      <header className="harness__bar">
        <span className="harness__kicker">
          Nonet · {puzzle.difficulty} · {puzzle.givenCount} givens · score {puzzle.score}
        </span>
        <div className="harness__meta">
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: 'setMode',
                mode: session.mode === 'cellFirst' ? 'digitFirst' : 'cellFirst',
              })
            }
          >
            {session.mode === 'cellFirst' ? 'Cell first' : 'Digit first'}
          </button>
          <button type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
            {theme}
          </button>
          <span>{session.status}</span>
        </div>
      </header>

      <main className="harness__stage">
        <BoardLayout
          session={session}
          onAction={dispatch}
          elapsedMs={elapsedMs}
          paused={paused}
          onPause={() => setPaused(true)}
          onResume={() => setPaused(false)}
          onRetry={() => window.location.reload()}
          onConfirmHint={() => dispatch({ type: 'hint' })}
          back={<span className="harness__back">← Today</span>}
        />
      </main>
    </div>
  );
}

const root = document.getElementById('root');
if (root !== null) {
  createRoot(root).render(
    <StrictMode>
      <Harness />
    </StrictMode>,
  );
}
