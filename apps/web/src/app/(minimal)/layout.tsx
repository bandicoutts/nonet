import { MinimalChrome } from '@/components/chrome/MinimalChrome';

/**
 * Minimal chrome: the wordmark and nothing else.
 *
 * Used where a full nav would be noise — Auth, and (through the same component)
 * the 404 and load-error screens, which render their own way out.
 */
export default function MinimalLayout({ children }: { children: React.ReactNode }) {
  return <MinimalChrome>{children}</MinimalChrome>;
}
