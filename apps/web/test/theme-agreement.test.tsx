import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from '@/components/SettingsScreen';
import { MobileDrawer } from '@/components/chrome/MobileDrawer';
import { THEME_KEY } from '@/lib/theme';

/**
 * The two surfaces that draw a theme control must agree.
 *
 * The choice is stored twice on purpose: under its own key, which the blocking
 * `<head>` script reads before first paint because it cannot parse JSON, and
 * again in the settings blob so it syncs to `profiles` with the other six. What
 * was not on purpose is that the two surfaces read *different* copies —
 * Settings from the key, the drawer from the blob — with three writers keeping
 * them in step and nothing reconciling them if they ever diverged (NONET-41).
 *
 * These tests do not assert that both copies are written. `SettingsScreen.test`
 * already pins that. They assert the weaker and more useful thing: that a
 * choice made on one surface is what the other one shows.
 */
vi.mock('@/lib/supabase/client', () => ({ createClient: () => null, isConfigured: () => false }));

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});
afterEach(cleanup);

/** The drawer's theme buttons live inside its dialog, next to the pad's chips. */
async function openDrawer(user: ReturnType<typeof userEvent.setup>) {
  render(<MobileDrawer email={null} />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  return within(screen.getByRole('dialog'));
}

const pressed = (root: ReturnType<typeof within>, name: string) =>
  root.getByRole('button', { name }).getAttribute('aria-pressed');

describe('a theme chosen on Settings', () => {
  it('is what the drawer shows', async () => {
    const user = userEvent.setup();

    render(<SettingsScreen />);
    await user.click(screen.getByRole('button', { name: 'Dark' }));
    cleanup();

    const drawer = await openDrawer(user);
    expect(pressed(drawer, 'Dark')).toBe('true');
    expect(pressed(drawer, 'System')).toBe('false');
  });
});

describe('a theme chosen in the drawer', () => {
  it('is what Settings shows', async () => {
    const user = userEvent.setup();

    const drawer = await openDrawer(user);
    await user.click(drawer.getByRole('button', { name: 'Light' }));
    cleanup();

    render(<SettingsScreen />);
    expect(screen.getByRole('button', { name: 'Light' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Dark' }).getAttribute('aria-pressed')).toBe('false');
  });
});

/**
 * The divergence case, which is the one the old code got wrong.
 *
 * With only the standalone key set — which is exactly the state the `<head>`
 * script acts on, and therefore what the player is looking at — both surfaces
 * have to report it. Reading the blob here yields `system`, so a drawer built
 * that way would show `System` on a page rendering dark.
 */
describe('when only the key the pre-paint script reads is set', () => {
  it('is reported by both surfaces, because both read that key', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(THEME_KEY, 'dark');

    render(<SettingsScreen />);
    expect(screen.getByRole('button', { name: 'Dark' }).getAttribute('aria-pressed')).toBe('true');
    cleanup();

    const drawer = await openDrawer(user);
    expect(pressed(drawer, 'Dark')).toBe('true');
  });
});
