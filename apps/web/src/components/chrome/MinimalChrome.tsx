import Link from 'next/link';

/**
 * The wordmark and nothing else.
 *
 * Shared by the `(minimal)` route group and by `not-found` / `error`, which sit
 * at the app root and so cannot be inside a group — they would otherwise render
 * with no chrome at all, and DESIGN.md requires every screen to have a way out.
 */
export function MinimalChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col px-ml drawer:px-2xl rail:px-4xl">
      <header className="pt-ml drawer:pt-xl">
        <Link href="/" className="type-wordmark text-fg no-underline">
          NONET
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
