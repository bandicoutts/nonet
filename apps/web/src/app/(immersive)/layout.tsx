/**
 * The board is a mode, not a page: no site nav during play (GAME-RULES.md).
 *
 * The way out is a left-aligned back control labelled for where the player came
 * from — `← TODAY` or `← ARCHIVE` — which belongs to the board itself, since
 * only it knows the origin. Never "close": the puzzle is autosaved and nothing
 * is discarded (NONET-2).
 */
export default function ImmersiveLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
