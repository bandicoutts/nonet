import { Suspense } from 'react';
import { PostSignIn } from '@/components/PostSignIn';
import { SiteFooter } from '@/components/chrome/SiteFooter';
import { SiteHeader } from '@/components/chrome/SiteHeader';

/**
 * Browsing chrome: site header and footer, on every screen that is a page
 * rather than a puzzle. Board and Solved are immersive and get neither;
 * Auth gets a minimal header.
 *
 * The page gutter is layout.md's 88 / 40 / 20, snapped to the space scale —
 * 40 is one of the 26 off-scale values the export records as a defect, so it
 * becomes 44 (NONET-6, `nearestSpace`).
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col px-ml drawer:px-2xl rail:px-4xl">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />

      {/* Reads search params, so it needs a boundary to keep the rest of the
          page static. It renders nothing unless a merge just happened. */}
      <Suspense fallback={null}>
        <PostSignIn />
      </Suspense>
    </div>
  );
}
