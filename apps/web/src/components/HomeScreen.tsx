'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DIFFICULTIES } from '@nonet/engine';
import type { Difficulty } from '@nonet/engine';
import { AbandonConfirm } from './AbandonConfirm';
import { dailyStatus, practiceInFlight } from '@/lib/home';
import type { DailyStatus, InFlightBoard } from '@/lib/home';
import { difficultyLabel, formatDuration } from '@/lib/result';
import { puzzleFor } from '@/lib/puzzle-cache';
import { pickPractice, refParams } from '@/lib/puzzles';
import { clearAutosave, readSolves } from '@/lib/storage';
import { currentStreak, longestStreak } from '@/lib/streak';

/** The design's given count per band — what a player is choosing between. */
const BAND_GIVENS: Readonly<Record<Difficulty, number>> = {
  easy: 38,
  medium: 34,
  hard: 30,
  expert: 24,
};

const PRIMARY =
  'type-button inline-flex min-h-(--tap-target-min) items-center border-0 bg-fg px-l text-bg no-underline ' +
  'cursor-pointer transition-colors duration-(--motion-hover) ease-(--ease-hover) ' +
  'hover:bg-accent hover:text-accent-ink ' +
  'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)';

/**
 * Home.
 *
 * Which of six things it shows is decided in `lib/home.ts`, not here — every
 * branch has different copy and two have different actions, so the precedence
 * is worth proving without a browser (NONET-23).
 *
 * Copy from `design/export/copy.md`, with two deliberate omissions marked where
 * they sit: the median solve times, which no data exists for yet, and the
 * "Replay, unscored" action, which would land on a board that records a scored
 * solve.
 */
export function HomeScreen({ now }: { now?: Date }) {
  const router = useRouter();

  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [practice, setPractice] = useState<InFlightBoard | null>(null);
  const [streak, setStreak] = useState({ current: 0, best: 0, solved: 0 });
  const [pending, setPending] = useState<Difficulty | null>(null);

  /* Read in an effect: there is no localStorage on the server (NONET-15). */
  const load = useCallback(() => {
    const at = now ?? new Date();
    setStatus(dailyStatus(at));
    setPractice(practiceInFlight());

    const dailies = readSolves().filter((s) => s.kind === 'daily');
    const today = (now ?? new Date()).toISOString().slice(0, 10);
    setStreak({
      current: currentStreak(dailies, today),
      best: longestStreak(dailies),
      solved: dailies.length,
    });
  }, [now]);

  useEffect(load, [load]);

  /*
   * The plate states how many cells are open, which is `81 - givens` — and a
   * given count is not derivable from the band, because the generator stops at
   * its target and may leave a grid denser (NONET-3). Regenerated from the
   * seed, in an effect so it is not on the path to first paint.
   */
  const [givens, setGivens] = useState<number | null>(null);
  useEffect(() => {
    if (status === null) return;
    const puzzle = puzzleFor(status.ref.difficulty, status.ref.seed);
    setGivens(puzzle.givens.filter((c) => c !== 0).length);
  }, [status]);

  const startPractice = useCallback(
    (difficulty: Difficulty) => {
      const ref = pickPractice(difficulty);
      router.push(`/board?${refParams(ref)}`);
    },
    [router],
  );

  /*
   * Starting a practice puzzle while one is open discards it, and practice
   * boards are not kept — so the player is asked. This is the one control on
   * Home that destroys something.
   */
  const choose = useCallback(
    (difficulty: Difficulty) => {
      if (practice === null) startPractice(difficulty);
      else setPending(difficulty);
    },
    [practice, startPractice],
  );

  if (status === null) return null;

  const boardHref = `/board?${refParams(status.ref)}`;

  return (
    <section className="mx-auto flex w-full max-w-[62rem] flex-col gap-xl px-m py-l drawer:px-2xl rail:px-4xl">
      {/* The hero splits 1fr / 500px on the rail and stacks below it
          (layout.md). The plate is the right-hand column: what this edition
          *is*, next to what you can do about it. */}
      <div className="grid gap-l rail:grid-cols-[1fr_500px] rail:items-start rail:gap-4xl">
        <div>
          <p className="type-mono-label text-fg3-text">
            {status.state === 'solved' ? 'Solved · ' : ''}
            {longDate(status.editionDate)}
          </p>
          <p className="type-body text-fg2 mt-s">No.</p>
          <p className="type-hero-number text-fg tabular-nums">{status.number}</p>

          <div className="mt-m">
            <Hero status={status} boardHref={boardHref} onPractice={choose} />
          </div>
        </div>

        <div className="border-t border-rule pt-m rail:border-t-0 rail:border-l rail:border-line rail:pt-0 rail:pl-l">
          <p className="type-body-small text-fg2">
            Nonet No. {status.number} — {difficultyLabel(status.difficulty)}
          </p>
          <p className="type-body-small text-fg3-text mt-2xs">
            {givens === null ? '' : `${givens} givens, ${81 - givens} open cells`}
          </p>
          <p className="type-body-small text-fg3-text">
            Daily edition, {longDate(status.editionDate)}
          </p>
        </div>
      </div>

      {status.state === 'first-visit' ? null : (
        <StreakBand current={streak.current} best={streak.best} solved={streak.solved} />
      )}

      {/* Named so the result screen can land a player on the picker rather
          than at the top of Home. */}
      <div id="practice" className="flex flex-col gap-s border-t border-rule pt-m scroll-mt-l">
        <p className="type-mono-label text-fg3-text">Practice — unlimited</p>

        {practice === null ? null : (
          <div className="flex flex-wrap items-baseline justify-between gap-s border border-line bg-surface p-s">
            <p className="type-body-small text-fg2">
              Unfinished practice puzzle — {difficultyLabel(practice.ref.difficulty)},{' '}
              {practice.placed} of 81 placed
            </p>
            <Link href={`/board?${refParams(practice.ref)}`} className="type-control text-accent no-underline hover:text-fg">
              Resume · {formatDuration(practice.elapsedMs)} &rarr;
            </Link>
          </div>
        )}

        <ul className="flex flex-col">
          {DIFFICULTIES.map((band) => (
            <li key={band}>
              <button
                type="button"
                onClick={() => choose(band)}
                className="type-body flex min-h-(--tap-target-min) w-full cursor-pointer items-baseline justify-between gap-s border-0 border-b border-line bg-transparent px-0 py-s text-left text-fg hover:text-accent focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset)"
              >
                <span>
                  {difficultyLabel(band)}{' '}
                  <span className="type-body-small text-fg3-text">
                    — {BAND_GIVENS[band]} givens
                  </span>
                </span>
                <span aria-hidden="true" className="text-fg3-text">
                  &rarr;
                </span>
              </button>
            </li>
          ))}
        </ul>
        {/* copy.md gives a median time per band. Omitted: no solve data exists
            yet, and inventing one would be a statistic rather than a figure.
            Record derives real medians once there are solves to derive from. */}
      </div>

      {pending === null || practice === null ? null : (
        <AbandonConfirm
          board={practice}
          difficulty={pending}
          onDiscard={() => {
            clearAutosave(practice.ref);
            setPending(null);
            startPractice(pending);
          }}
          onKeep={() => setPending(null)}
        />
      )}
    </section>
  );
}

function Hero({
  status,
  boardHref,
  onPractice,
}: {
  status: DailyStatus;
  boardHref: string;
  onPractice: (difficulty: Difficulty) => void;
}) {
  switch (status.state) {
    case 'first-visit':
      return (
        <div className="flex flex-col items-start gap-s">
          <p className="type-body text-fg2 max-w-[46ch]">
            Solve today&rsquo;s puzzle to start a run. One a day, no catching up.
          </p>
          <Link href={boardHref} className={PRIMARY}>
            Enter the puzzle &rarr;
          </Link>
        </div>
      );

    case 'ready':
      return (
        <div className="flex flex-col items-start gap-s">
          <p className="type-body-small text-fg2">
            {difficultyLabel(status.difficulty)} · one solution
          </p>
          <Link href={boardHref} className={PRIMARY}>
            Enter the puzzle &rarr;
          </Link>
          <p className="type-mono-label text-fg3-text">Unopened</p>
        </div>
      );

    case 'in-progress':
      return (
        <div className="flex flex-col items-start gap-s">
          <p className="type-body-small text-fg2">
            {status.placed} of 81 placed
            {status.mistakes === undefined
              ? ''
              : ` · ${status.mistakes} ${status.mistakes === 1 ? 'mistake' : 'mistakes'}`}
          </p>
          <Link href={boardHref} className={PRIMARY}>
            Resume · {formatDuration(status.elapsedMs ?? 0)} &rarr;
          </Link>
          <p className="type-mono-label text-fg3-text">Saved in this browser</p>
        </div>
      );

    case 'solved':
      return (
        <div className="flex flex-col items-start gap-s">
          <p className="type-kicker text-fg3-text">Solved today</p>
          <p className="type-stat-number text-fg tabular-nums">
            {formatDuration(status.solve?.durationMs ?? 0)}
          </p>
          <button type="button" onClick={() => onPractice('hard')} className={PRIMARY}>
            Practice a hard one
          </button>
          {/* copy.md offers "Replay, unscored" as a secondary action here.
              Deliberately absent: replay mode does not exist — `solves.kind`
              can hold 'replay' and nothing writes it — so the link would land
              on the ordinary daily board and record a second *scored* solve for
              a puzzle already banked. */}
        </div>
      );

    case 'failed':
      return (
        <div className="flex flex-col items-start gap-s">
          <p className="type-kicker text-error">Three mistakes — puzzle locked</p>
          <p className="type-body text-fg2 max-w-[52ch]">
            You can start today&rsquo;s puzzle again from scratch. Finish before midnight and the
            run stays intact, though the solve will be marked a second attempt.
          </p>
          <Link href={boardHref} className={PRIMARY}>
            Start again
          </Link>
          <p className="type-mono-label text-fg3-text">The run is held until midnight</p>
        </div>
      );

    /*
     * Not in copy.md, which only ever drew one failed state. There is no third
     * attempt (NONET-17), so this keeps the message and loses the action —
     * exactly as the pause veil does when its retry is spent.
     */
    case 'spent':
      return (
        <div className="flex flex-col items-start gap-s">
          <p className="type-kicker text-error">Three mistakes — puzzle locked</p>
          <p className="type-body text-fg2 max-w-[52ch]">
            Both attempts at today&rsquo;s puzzle are gone. The next edition arrives tomorrow, and
            practice is unlimited in the meantime.
          </p>
        </div>
      );
  }
}

function StreakBand({ current, best, solved }: { current: number; best: number; solved: number }) {
  return (
    <div className="border-t border-rule pt-m">
      <p className="type-mono-label text-fg3-text">Consecutive days</p>
      <p className="type-streak-number text-fg tabular-nums">{current}</p>
      <p className="type-body-small text-fg3-text">
        best {best} · {solved} solved
      </p>
    </div>
  );
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** `27 July 2026`, from the date parts so no timezone can shift it. */
function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}
