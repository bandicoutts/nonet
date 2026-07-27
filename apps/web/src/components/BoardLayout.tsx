import type { ReactNode } from 'react';
import type { Action, SessionState } from '@nonet/engine';
import { Board } from './Board';
import { BoardToolbar } from './BoardToolbar';
import { NumberPad } from './NumberPad';
import { PauseVeil } from './PauseVeil';
import styles from './BoardLayout.module.css';

export interface BoardLayoutProps {
  readonly session: SessionState;
  readonly onAction: (action: Action) => void;
  readonly elapsedMs: number;
  readonly paused: boolean;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onRetry: () => void;
  readonly onConfirmHint: () => void;
  /** The back control, labelled for where the player came from. */
  readonly back: ReactNode;
}

/**
 * The board screen: grid, controls and veil.
 *
 * Three compositions, one markup order. At 1100 and up the controls sit in a
 * 320px rail beside the grid; below that they become a full-width band under
 * it; below the drawer breakpoint the band sticks to the bottom of the
 * viewport so the pad stays under the thumb. See `design/export/layout.md`.
 */
export function BoardLayout({
  session,
  onAction,
  elapsedMs,
  paused,
  onPause,
  onResume,
  onRetry,
  onConfirmHint,
  back,
}: BoardLayoutProps) {
  const locked = session.status === 'failed';
  const veiled = paused || locked;

  return (
    <div className={styles.layout}>
      <div className={styles.gridArea}>
        <div className={styles.titleBar}>{back}</div>

        <div className={styles.gridWrap}>
          {/*
            The grid stays mounted so resuming does not rebuild it, but while
            veiled it is hidden from assistive technology as well as from view.
            A veil a screen reader reads straight through is not a pause.
          */}
          <div aria-hidden={veiled ? true : undefined} inert={veiled}>
            <Board session={session} onAction={onAction} onPause={onPause} />
          </div>

          {veiled ? (
            <PauseVeil
              reason={locked ? 'locked' : 'paused'}
              onResume={onResume}
              onRetry={onRetry}
            />
          ) : null}
        </div>
      </div>

      <aside className={styles.rail} aria-label="Board controls">
        <BoardToolbar
          session={session}
          onAction={onAction}
          onPause={onPause}
          onConfirmHint={onConfirmHint}
          elapsedMs={elapsedMs}
        />
        <NumberPad session={session} onAction={onAction} />
      </aside>
    </div>
  );
}
