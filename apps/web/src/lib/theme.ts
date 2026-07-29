/**
 * Theme choice, and the script that applies it before first paint.
 *
 * The token sheet emits light on `:root`, dark under `prefers-color-scheme`,
 * and both `[data-theme]` overrides — so an explicit choice wins in either
 * direction (NONET-6). That guarantee is only as good as *when* the attribute
 * lands: applied in an effect, a player who chose light sees a dark flash on
 * every load, and the one thing the prototype could not do would be broken
 * again in the build.
 *
 * Hence a blocking inline script in `<head>`. It is the standard cost of
 * honouring an explicit theme without a server round-trip, and it is kept to a
 * single `localStorage` read.
 */

export const THEME_CHOICES = ['light', 'dark', 'system'] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

export const THEME_KEY = 'nonet:theme';

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === 'string' && (THEME_CHOICES as readonly string[]).includes(value);
}

/**
 * Runs in `<head>`, before the body exists.
 *
 * `system` and anything unrecognised leave the attribute off, which hands the
 * decision back to the media query. `localStorage` is wrapped because it throws
 * outright in some privacy modes — a theme preference is never worth blocking
 * first paint over.
 */
export const THEME_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}`;

/**
 * The stored choice, or `system` when there is none. Client only.
 *
 * **This is where a screen reads the theme from.** The choice also lives in the
 * settings blob so it syncs to `profiles` with the other six, but the blob is a
 * copy for the sync's benefit — this key is what the `<head>` script reads
 * before first paint, so it is what the player is actually looking at. Both
 * surfaces that draw a theme control read it here; a surface reading the blob
 * instead is one that can disagree with the page it is drawn on (NONET-41).
 */
export function readTheme(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return isThemeChoice(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

/** Persist a choice and apply it, keeping the attribute and storage in step. */
export function writeTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    // A player who cannot persist can still change the theme for this session.
  }

  if (choice === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', choice);
  }
}
