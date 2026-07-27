import type { ReactNode } from 'react';
import type { Action, SessionState } from '@nonet/engine';
import { Board } from './Board';
import { BoardToolbar } from './BoardToolbar';
import { NumberPad } from './NumberPad';
import { PauseVeil } from './PauseVeil';
/*
 * Board composition at three widths. Figures from design/export/layout.md.
 *
 * The markup order never changes — grid first, controls second — so the tab
 * order and the reading order stay the same at every width. Only the placement
 * moves.
 */
const LAYOUT =
  'grid w-full gap-s drawer:gap-l rail:grid-cols-[minmax(0,1fr)_320px] rail:items-start rail:gap-0';

/** Desktop: a 320px rail to the right of the grid, separated by a rule. */
const GRID_AREA = 'min-w-0 rail:py-m rail:pr-2xl';

const TITLE_BAR =
  'flex items-center justify-between pb-s ' +
  'drawer:mb-m drawer:border-b drawer:border-line';

/*
 * Below 1100 the rail becomes a band under the grid; below the drawer
 * breakpoint that band sticks to the bottom of the viewport, so the pad stays
 * under the thumb while the grid scrolls behind it.
 */
const RAIL =
  'flex min-w-0 flex-col gap-sm ' +
  'sticky bottom-0 z-20 bg-bg pt-s pb-m ' +
  'drawer:static drawer:bg-transparent drawer:pt-m drawer:pb-0 drawer:border-t-2 drawer:border-rule ' +
  'rail:border-t-0 rail:border-l rail:border-line rail:py-m rail:pl-[36px]';

export interface BoardLayoutProps {
  readonly session: SessionState;
  readonly onAction: (action: Action) => void;
  readonly elapsedMs: number;
  readonly paused: boolean;
  readonly onPause: () => void;
  readonly onResume: () => void;
  /** Absent when the retry is spent — there is no third attempt. */
  readonly onRetry?: () => void;
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
    <div className={LAYOUT}>
      <div className={GRID_AREA}>
        <div className={TITLE_BAR}>{back}</div>

        {/* The veil is absolutely placed against this. */}
        <div className="relative">
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
              elapsedMs={elapsedMs}
              onResume={onResume}
              {...(onRetry === undefined ? {} : { onRetry })}
            />
          ) : null}
        </div>
      </div>

      <aside className={RAIL} aria-label="Board controls">
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
