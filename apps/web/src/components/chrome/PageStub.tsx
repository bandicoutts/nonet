/**
 * A route that exists but has no surface yet.
 *
 * Phase 3 lands the shell — the routes, their chrome and the navigation
 * between them. The screens themselves are Phase 4, so rather than invent copy
 * the design has already specified in `design/export/copy.md`, each route says
 * plainly what it is and what is still missing. A stub that admits it is a stub
 * cannot be mistaken for a finished screen in review.
 */
export function PageStub({ kicker, note }: { kicker: string; note: string }) {
  return (
    <section className="pt-xl drawer:pt-3xl">
      <p className="type-kicker text-fg3-text">{kicker}</p>
      <p className="type-body text-fg2 mt-s max-w-[52ch]">{note}</p>
    </section>
  );
}
