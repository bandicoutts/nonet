/**
 * The three widths the design was drawn at. Type sizes and spacing are
 * specified per viewport, so these index every responsive token.
 */
export const VIEWPORTS = [390, 834, 1440] as const;

export type Viewport = (typeof VIEWPORTS)[number];

/** A value that changes with viewport. */
export type Responsive<T> = Readonly<Record<Viewport, T>>;

/**
 * Where the layout actually switches, which is **not** where it was drawn
 * (DECISIONS.md NONET-2). Below `drawer` the site nav collapses into the mobile
 * drawer; at `rail` and above the board gains its side rail and loses the
 * bottom control band.
 */
export const BREAKPOINTS = {
  drawer: 768,
  rail: 1100,
} as const;

/**
 * The design viewport a real browser width should use.
 *
 * The export specifies values at 390, 834 and 1440 — the widths the design was
 * drawn at — while NONET-2 puts the layout switches at 768 and 1100. Joining
 * the two is an inference, not a transcription: below the drawer breakpoint the
 * mobile drawing applies, between drawer and rail the tablet drawing, and from
 * the rail up the desktop drawing.
 */
export function viewportForWidth(width: number): Viewport {
  if (width < BREAKPOINTS.drawer) return 390;
  if (width < BREAKPOINTS.rail) return 834;
  return 1440;
}

export function isResponsive<T>(value: T | Responsive<T>): value is Responsive<T> {
  return typeof value === 'object' && value !== null && '390' in (value as object);
}

/** Pick the value for a viewport, passing flat values through unchanged. */
export function atViewport<T>(value: T | Responsive<T>, viewport: Viewport): T {
  return isResponsive(value) ? value[viewport] : value;
}
