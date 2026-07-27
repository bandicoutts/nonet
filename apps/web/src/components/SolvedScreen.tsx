'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { generatePuzzle } from '@nonet/engine';
import { buildResult, difficultyLabel, formatCountdown, formatDuration, shareText } from '@/lib/result';
import type { Result } from '@/lib/result';
import { readSolves } from '@/lib/storage';
import type { GuestSolve, PuzzleRef } from '@/lib/storage';

/** How long the Copied toast dwells, per `components.md`. */
const TOAST_MS = 1800;

/**
 * The result screen.
 *
 * Everything it claims comes from `result.ts`, which is pure and tested without
 * a browser — the run went from 17 to 18, the solve is ranked, it took seven
 * minutes. Those are claims a player will believe, and none of them is checkable
 * by looking at the screen. The only figure fetched is the percentile, and it
 * arrives late and optional (see `percentile.ts`): a network that is down
 * degrades one stat, never the screen.
 *
 * Copy from `design/export/copy.md`, layout from `layout.md` and the stat grid
 * from `components.md`.
 */
export function SolvedScreen({
  puzzleRef,
  onLeave,
  getPercentile,
  now,
}: {
  readonly puzzleRef: PuzzleRef;
  /** Where to send a player who has no solve here to describe. */
  readonly onLeave: () => void;
  readonly getPercentile: (solve: GuestSolve) => Promise<number | null>;
  /** Injected so the countdown and the run are testable. */
  readonly now?: Date;
}) {
  const [solve, setSolve] = useState<GuestSolve | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  /*
   * Three states, not two. `undefined` is "still asking".
   *
   * A ranked solve shows the Percentile label with a dash while the answer is
   * in flight, and only falls back to "Ranked / No" once the figure is known to
   * be absent. Collapsing pending into null instead makes the screen tell the
   * player their solve was not ranked and then contradict itself a moment
   * later, which is worse than a stat that is briefly blank.
   */
  const [percentile, setPercentile] = useState<number | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  /*
   * Read in an effect, not in initial state: a client component is still
   * server-rendered for the first HTML and there is no localStorage there
   * (NONET-15).
   */
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    const history = readSolves();
    const mine = history.filter(
      (s) =>
        s.ref.kind === puzzleRef.kind &&
        s.ref.difficulty === puzzleRef.difficulty &&
        s.ref.seed === puzzleRef.seed,
    );

    // The latest attempt is the one that just finished. A retry that solved
    // must not be described by the first attempt's time.
    const latest = mine.reduce<GuestSolve | null>(
      (best, s) => (best === null || s.solvedAt >= best.solvedAt ? s : best),
      null,
    );

    if (latest === null) {
      onLeave();
      return;
    }

    const built = buildResult(latest, history, now);
    setSolve(latest);
    setResult(built);

    /*
     * Only a ranked solve is asked about at all. The server would answer for an
     * assisted or second-attempt solve too — `daily_percentile` takes a
     * duration, not a solve — and showing that figure would break the promise
     * the hint confirmation makes in as many words: a hint "gives up today's
     * percentile".
     */
    if (built.ranked) void getPercentile(latest).then(setPercentile);
    else setPercentile(null);
    // Once, for this puzzle. `puzzleRef` does not change while mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * The plate states how many cells the player entered, which is `81 - givens`
   * — and a given count is not derivable from the band, because the generator
   * stops at the target and may leave a puzzle denser (NONET-3). So the puzzle
   * is regenerated from its seed, deterministically.
   *
   * In an effect rather than in render because it is not free: measured at a
   * median of 3ms easy through 14ms expert, with an expert worst case of 189ms
   * when the generator re-rolls. That is affordable once, and not on the path
   * to first paint.
   */
  const [entered, setEntered] = useState<number | null>(null);
  useEffect(() => {
    const puzzle = generatePuzzle(puzzleRef.difficulty, puzzleRef.seed);
    setEntered(puzzle.givens.filter((cell) => cell === 0).length);
  }, [puzzleRef.difficulty, puzzleRef.seed]);

  /* The countdown is the one live thing on the screen. */
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (result === null || now !== undefined) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [result, now]);

  const share = useMemo(() => {
    if (solve === null || result === null || result.number === null) return null;
    return shareText({
      number: result.number,
      difficulty: result.difficulty,
      durationMs: result.durationMs,
      mistakes: result.mistakes,
      // A pending figure is not put in shared text — better absent than wrong.
      percentile: percentile ?? null,
    });
  }, [solve, result, percentile]);

  if (solve === null || result === null) return null;

  const remaining = Math.max(0, result.nextEditionMs - tick * 1000);
  const dateLabel = result.editionDate === null ? null : longDate(result.editionDate);

  async function copy() {
    if (share === null) return;
    try {
      await navigator.clipboard.writeText(share);
      setCopied(true);
      setTimeout(() => setCopied(false), TOAST_MS);
    } catch {
      // Denied, or no clipboard. Saying nothing is right: the toast is the only
      // evidence either way, and claiming a copy that did not happen is worse
      // than a button that appears to have done nothing.
    }
  }

  return (
    <section className="mx-auto flex w-full max-w-[52rem] flex-1 flex-col gap-l px-m py-l drawer:px-2xl rail:px-4xl">
      <header className="flex items-baseline justify-between gap-s">
        <p className="type-mono-label text-fg3-text">
          {result.number === null
            ? `Practice — ${difficultyLabel(result.difficulty)}`
            : `No. ${result.number} · ${dateLabel}`}
        </p>
        <Link
          href="/"
          className="type-control flex min-h-(--tap-target-min) items-center text-fg2 no-underline hover:text-fg"
        >
          &larr; Today
        </Link>
      </header>

      <div>
        <p className="type-kicker text-fg3-text">Complete</p>
        <p className="type-body text-fg2 mt-2xs">Solved in</p>
        <p className="type-result-number text-fg tabular-nums">{formatDuration(result.durationMs)}</p>
      </div>

      {result.run === null ? null : (
        <div className="border-t border-rule pt-m">
          <p className="type-mono-label text-fg3-text">Run extended</p>
          <p className="type-streak-number text-fg tabular-nums mt-2xs">
            {result.run.from} &rarr; {result.run.to}
          </p>
          <p className="type-body-small text-fg2 mt-2xs">Longest run {result.run.best}</p>
          <p className="type-body-small text-fg3-text">
            Come back tomorrow — next puzzle in{' '}
            <span className="tabular-nums">{formatCountdown(remaining)}</span>
          </p>
        </div>
      )}

      <StatGrid result={result} percentile={percentile} />

      {result.variant === 'standard' ? null : (
        <p className="type-body-small text-fg2">{VARIANT_NOTE[result.variant]}</p>
      )}

      <div className="border-t border-rule pt-m">
        <p className="type-body-small text-fg3-text">
          {result.number === null
            ? `Nonet practice — ${difficultyLabel(result.difficulty)}`
            : `Nonet No. ${result.number} — ${difficultyLabel(result.difficulty)}`}
        </p>
        {dateLabel === null ? null : (
          <p className="type-body-small text-fg3-text">
            Solved {dateLabel}
            {entered === null ? '' : ` · ${entered} cells entered`}
          </p>
        )}
      </div>

      {share === null ? null : (
        <div className="flex flex-col gap-s">
          <pre className="type-mono-data border border-line bg-surface p-s text-fg2 whitespace-pre-wrap">
            {share}
          </pre>
          <p className="type-body-small text-fg3-text">
            This is exactly what gets copied — no grid, no spoilers.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-s">
        {share === null ? null : (
          <button
            type="button"
            onClick={copy}
            className="type-button min-h-(--tap-target-min) cursor-pointer border-0 bg-fg px-l text-bg transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-accent hover:text-accent-ink focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)"
          >
            Share result &#8599;
          </button>
        )}
        <Link
          href="/"
          className="type-button flex min-h-(--tap-target-min) items-center border border-fg px-l text-fg no-underline transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-hover focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)"
        >
          Practice another
        </Link>
      </div>

      {/* Announced politely: the button gives no other feedback, and a player
          using a screen reader has no way to know the copy succeeded. */}
      <p role="status" aria-live="polite" className="type-mono-label text-fg3-text">
        {copied ? 'Copied' : ''}
      </p>
    </section>
  );
}

const VARIANT_NOTE = {
  assisted: 'Assisted — one or more hints used. No percentile for assisted solves.',
  second: 'Second attempt — the run holds, but this solve is not ranked.',
  unchecked: 'Unchecked — you played with checking off, so mistakes were not tracked.',
  standard: '',
} as const;

/**
 * The stat grid.
 *
 * Bounded top and bottom by a hairline with a rule between columns, per
 * `components.md`. One column below the drawer breakpoint, two at it, the full
 * role count on the rail — the prototype's 1/2/4 at 390/834/1440, mapped onto
 * the product's own breakpoints (NONET-17).
 *
 * The fourth stat changes *label* rather than value when a solve is not ranked:
 * `copy.md` gives "Ranked / No". Keeping "Percentile" and showing a dash would
 * read as a figure that failed to load rather than one that was never earned.
 */
/**
 * Per-cell rules for the four stat blocks, at each of the three column counts.
 *
 * `components.md`: a rule between columns, a softer hairline above a wrapped
 * row. Written out per index rather than composed, because the column count
 * changes which of the four blocks *starts* a row — and because Tailwind only
 * generates classes it can find as literal text, so a class string assembled at
 * runtime produces no CSS at all, silently (NONET-12).
 *
 *   1 column  — every block after the first opens a row: top rule on 1, 2, 3.
 *   2 columns — blocks 2 and 3 open the second row; 1 and 3 sit right of a rule.
 *   4 columns — one row, so no top rules; 1, 2 and 3 sit right of a rule.
 */
const CELL_RULES = [
  '',
  'border-t drawer:border-t-0 drawer:border-l rail:border-l',
  'border-t rail:border-t-0 rail:border-l',
  'border-t drawer:border-l rail:border-t-0 rail:border-l',
] as const;

function StatGrid({
  result,
  percentile,
}: {
  result: Result;
  percentile: number | null | undefined;
}) {
  /*
   * "Ranked — No" means **ineligible**, and only that.
   *
   * Eligibility is decided by the rules and is known offline: a hint, a retry
   * or checking off forfeits the percentile, and the note underneath says which.
   * Whether the *figure* arrives is a different question — an edition below the
   * 20-solve floor, an unpublished row, a network that is down. Collapsing the
   * two says "your solve was not ranked" about a clean first attempt that
   * simply could not be measured, which is false. So an eligible solve keeps
   * the Percentile label and shows a dash until there is a number to show.
   */
  const stats: ReadonlyArray<readonly [string, string]> = [
    ['Time', formatDuration(result.durationMs)],
    ['Difficulty', difficultyLabel(result.difficulty)],
    ['Mistakes', result.mistakes === null ? '—' : `${result.mistakes} of 3`],
    result.ranked
      ? ['Percentile', typeof percentile === 'number' ? `Top ${percentile}%` : '—']
      : ['Ranked', 'No'],
  ];

  return (
    <dl className="grid grid-cols-1 border-y border-line drawer:grid-cols-2 rail:grid-cols-4">
      {stats.map(([label, value], index) => (
        <div
          key={label}
          className={`flex flex-col gap-2xs border-t-line2 border-l-line px-0 py-m drawer:px-m ${CELL_RULES[index]}`}
        >
          <dt className="type-mono-label text-fg3-text">{label}</dt>
          <dd className="type-stat-number text-fg tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** `27 July 2026`, built from the date parts so no timezone can shift it. */
function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}
