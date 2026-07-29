import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from '@/components/SettingsScreen';

/**
 * The Settings account block, signed in.
 *
 * A file of its own because the mock is per module: `SettingsScreen.test.tsx`
 * pins `createClient` to null, which is the guest case, and a signed-in one
 * needs the opposite answer from the same import.
 *
 * What it is really guarding is a claim rather than a control. The block used
 * to state "Progress is kept in this browser only" without ever asking who was
 * playing — false for a signed-in player, and false in the direction that
 * matters, since it tells someone whose progress is synced that it is not.
 */
const signOut = vi.fn(() => Promise.resolve({ error: null }));
let email: string | null = 'player@example.com';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: () => Promise.resolve({ data: { user: email === null ? null : { email } } }),
      signOut,
    },
  }),
  isConfigured: () => true,
}));

beforeEach(() => {
  window.localStorage.clear();
  signOut.mockClear();
  email = 'player@example.com';
});
afterEach(cleanup);

describe('the account block when signed in', () => {
  it('names the signed-in address rather than calling them a guest', async () => {
    render(<SettingsScreen />);

    expect(await screen.findByText('player@example.com')).toBeDefined();
    expect(screen.queryByText('Playing as a guest')).toBeNull();
  });

  /*
   * The line that was actively wrong. "Progress is kept in this browser only"
   * is the guest promise; for a signed-in player it contradicts the reason
   * they signed in.
   */
  it('does not claim progress is browser-only', async () => {
    render(<SettingsScreen />);

    await screen.findByText('player@example.com');
    expect(screen.queryByText('Progress is kept in this browser only.')).toBeNull();
    expect(screen.getByText(/follow you between devices/)).toBeDefined();
  });

  /*
   * The reason this block needs a sign-out at all: `MobileDrawer` is
   * `drawer:hidden`, so above 768 its Account section does not exist and this
   * was the only place left that could carry one.
   */
  it('offers a sign-out, and scopes it locally', async () => {
    const user = userEvent.setup();
    render(<SettingsScreen />);

    await user.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    // Local, not global. The default revokes every session on every device,
    // which is not what signing out of one browser means.
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('offers no sign-in link, because there is nothing to sign in to', async () => {
    render(<SettingsScreen />);

    await screen.findByText('player@example.com');
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull();
  });
});

describe('the account block when the session resolves to nobody', () => {
  /*
   * Configured Supabase, no session: still a guest, and the guest copy is
   * unchanged from before this block asked anything.
   */
  it('keeps the guest copy and the sign-in link', async () => {
    email = null;
    render(<SettingsScreen />);

    expect(await screen.findByText('Playing as a guest')).toBeDefined();
    expect(screen.getByText('Progress is kept in this browser only.')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  });

  /*
   * Nothing is claimed before the answer is in. A block that says "guest" and
   * then flips to an address has told the player something false on the way
   * past — which is the same fault as the hardcoded copy, only briefer.
   */
  it('claims nothing while the answer is still in flight', async () => {
    email = null;
    render(<SettingsScreen />);

    expect(screen.queryByText('Playing as a guest')).toBeNull();
    expect(screen.queryByText('Progress is kept in this browser only.')).toBeNull();
    // The heading is there throughout, so the block does not appear from nowhere.
    expect(screen.getByText('Account')).toBeDefined();

    // Let the resolution land before the test ends, so the state update it
    // causes belongs to this test rather than warning inside the next one.
    await screen.findByText('Playing as a guest');
  });
});
