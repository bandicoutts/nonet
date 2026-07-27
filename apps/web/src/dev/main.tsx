/**
 * Component harness. Not the product — a place to look at and play the board
 * before the Next.js app shell arrives in Phase 3.
 */
import { StrictMode, useReducer, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { apply, createSession, generatePuzzle } from '@nonet/engine';
import type { Action, SessionState } from '@nonet/engine';
import { Board } from '../components/Board.js';
import { NumberPad } from '../components/NumberPad.js';
import { TokenStyles } from '../components/TokenStyles.js';
import './harness.css';

const puzzle = generatePuzzle('medium', 20260727);

function Harness() {
  const [session, dispatch] = useReducer(
    (state: SessionState, action: Action) => apply(state, action),
    createSession({ givens: puzzle.givens, solution: puzzle.solution }),
  );
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  document.documentElement.setAttribute('data-theme', theme);

  return (
    <div className="harness">
      <TokenStyles />

      <header className="harness__bar">
        <span className="harness__kicker">
          Nonet · {puzzle.difficulty} · {puzzle.givenCount} givens · score {puzzle.score}
        </span>
        <div className="harness__meta">
          <span>{session.mistakes}/3 mistakes</span>
          <span>{session.hintsUsed}/3 hints</span>
          <span>{session.status}</span>
          <button type="button" onClick={() => dispatch({ type: 'undo' })}>
            Undo
          </button>
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
        </div>
      </header>

      <main className="harness__stage">
        <Board session={session} onAction={dispatch} />
        <NumberPad session={session} onAction={dispatch} />
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
