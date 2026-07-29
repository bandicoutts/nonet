import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { currentEdition, dailyDifficulty, puzzleNumber } from '@nonet/engine';
import { palettes } from '@nonet/design';
import { OG_ALT, OG_SIZE } from '@/lib/og';

/**
 * The card a shared link unfurls into.
 *
 * **It names today's edition, and it is computed from the date alone.** That is
 * the same property that lets the daily be generated in the browser with
 * Supabase down (NONET-16): number, band and date all fall out of the calendar,
 * so this needs no database, no player data and no request context.
 *
 * It carries **no result**. A scraper does not run JavaScript and has no
 * `localStorage`, which is the only place a solve exists for a guest — so a
 * per-result card would mean putting the result in the share URL, reversing the
 * decision that a shared link points at the root (`lib/site.ts`) and handing
 * anyone a card they can forge by editing a query string.
 *
 * The card cannot disagree with the link, and not because a rule keeps them in
 * step: only a **daily** solve can be shared at all — `buildResult` gives every
 * other kind a `null` edition number and `SolvedScreen` hides the whole share
 * block for those — so the only link that exists is the root, and on the day it
 * is sent the root *is* the edition named here.
 *
 * Living at the app root means every route inherits it, which is right: the
 * link being shared is always `/`.
 */
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = 'image/png';

/**
 * A day. The edition turns over at 00:05 UTC and nothing else about the card
 * changes, so regenerating more often would buy nothing.
 *
 * The window is the cache boundary rather than the clock: a link shared just
 * before midnight and unfurled just after can show the new edition beside text
 * naming the old one. That is a few minutes a day, in text the sender has
 * already sent, and closing it would mean regenerating this hourly forever.
 */
export const revalidate = 86_400;

const BAND: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function longDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1]} ${year}`;
}

export default async function Image() {
  /*
   * A static instance at weight 700, vendored — see `assets/README.md`. The
   * `woff2` the app ships to browsers is unreadable here, and so is Archivo's
   * variable `ttf`; both were tried.
   */
  const archivo = await readFile(join(process.cwd(), 'assets/Archivo-Bold.ttf'));

  const date = currentEdition();
  const ground = palettes.dark['--bg'];
  const ink = palettes.dark['--fg'];
  const quiet = palettes.dark['--fg3-text'];
  const rule = palettes.dark['--line'];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: ground,
          color: ink,
          fontFamily: 'Archivo',
          padding: 84,
        }}
      >
        <div style={{ display: 'flex', fontSize: 40, letterSpacing: -1.8 }}>NONET</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 132, letterSpacing: -4 }}>
            No. {puzzleNumber(date)}
          </div>
          <div style={{ display: 'flex', fontSize: 40, color: quiet }}>
            {BAND[dailyDifficulty(date)]} · {longDate(date)}
          </div>
        </div>

        <div style={{ display: 'flex', borderTop: `2px solid ${rule}`, paddingTop: 26 }}>
          <div style={{ display: 'flex', fontSize: 34, color: quiet }}>
            One sudoku a day, the same grid for everyone.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Archivo', data: archivo, weight: 700, style: 'normal' }],
    },
  );
}
