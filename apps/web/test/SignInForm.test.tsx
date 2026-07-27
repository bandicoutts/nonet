import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

const signInWithOtp = vi.fn(async () => ({ error: null }));
const verifyOtp = vi.fn(async () => ({ error: null }));
let configured = true;

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => (configured ? { auth: { signInWithOtp, verifyOtp } } : null),
  isConfigured: () => configured,
}));

const { SignInForm } = await import('@/components/SignInForm');

beforeEach(() => {
  configured = true;
  replace.mockClear();
  signInWithOtp.mockClear();
  verifyOtp.mockClear();
  signInWithOtp.mockResolvedValue({ error: null });
  verifyOtp.mockResolvedValue({ error: null });
});

afterEach(cleanup);

async function requestCode(email = 'player@nonet.test') {
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.click(screen.getByRole('button', { name: /send the code/i }));
  await waitFor(() => expect(screen.getByLabelText(/code/i)).toBeDefined());
}

describe('SignInForm', () => {
  it('asks for a code rather than sending a link', async () => {
    render(<SignInForm />);
    await requestCode();

    expect(signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'player@nonet.test' }),
    );
  });

  /*
   * No `emailRedirectTo`. The whole reason for the code is that the player
   * never leaves the tab they started in — a redirect target would only matter
   * if they clicked a link in another browser, which is the failure this flow
   * exists to remove.
   */
  it('sends no redirect target, because nothing is being redirected', async () => {
    render(<SignInForm />);
    await requestCode();

    const call = signInWithOtp.mock.calls[0] as unknown as [
      { options?: { emailRedirectTo?: string } },
    ];
    expect(call[0].options?.emailRedirectTo).toBeUndefined();
  });

  it('names the address the code went to', async () => {
    render(<SignInForm />);
    await requestCode('someone@nonet.test');

    expect(screen.getByText(/someone@nonet.test/)).toBeDefined();
    expect(screen.getByText(/expires in fifteen minutes/)).toBeDefined();
  });

  it('verifies the code the player types', async () => {
    render(<SignInForm />);
    await requestCode();

    await userEvent.type(screen.getByLabelText(/code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(verifyOtp).toHaveBeenCalledWith({
      email: 'player@nonet.test',
      token: '123456',
      type: 'email',
    });
  });

  /*
   * The merge is what signing in is *for*, and it is triggered by `merged=1`.
   * The magic link got that marker from the callback route; a code never
   * touches the server, so the client has to add it — without this, signing in
   * silently stops carrying a guest's history across.
   */
  it('lands on the destination with the merge marker', async () => {
    render(<SignInForm next="/record" />);
    await requestCode();

    await userEvent.type(screen.getByLabelText(/code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/record?merged=1'));
  });

  /*
   * `next` is attacker-controlled and now reaches a client-side navigation
   * rather than the callback's server-side one, so it still goes through the
   * whitelist. The session is live at this point, which is the worst moment
   * for an open redirect (NONET-18).
   */
  it.each([
    ['//evil.example.com', '/?merged=1'],
    ['https://evil.example.com/record', '/?merged=1'],
    ['/record', '/record?merged=1'],
  ])('whitelists the destination %s', async (next, expected) => {
    render(<SignInForm next={next} />);
    await requestCode();

    await userEvent.type(screen.getByLabelText(/code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith(expected));
  });

  /*
   * A wrong or expired code is ordinary, not exceptional — it is six digits
   * typed by hand against a fifteen-minute window. The player stays on the
   * code step and can simply try again.
   */
  it('keeps the player on the code step when the code is wrong', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'invalid' } } as never);

    render(<SignInForm />);
    await requestCode();

    await userEvent.type(screen.getByLabelText(/code/i), '000000');
    await userEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/code/i)).toBeDefined();
  });

  it('can send another code', async () => {
    render(<SignInForm />);
    await requestCode();

    await userEvent.click(screen.getByRole('button', { name: /send again/i }));
    await waitFor(() => expect(signInWithOtp).toHaveBeenCalledTimes(2));
  });

  /*
   * The field has to be typed for what it is, or a password manager offers a
   * password and iOS does not offer the code it just received.
   */
  it('marks the field as a one-time code', async () => {
    render(<SignInForm />);
    await requestCode();

    const field = screen.getByLabelText(/code/i);
    expect(field.getAttribute('autocomplete')).toBe('one-time-code');
    expect(field.getAttribute('inputmode')).toBe('numeric');
    expect(field.getAttribute('maxlength')).toBe('6');
  });

  it('says so plainly when sign-in is not configured', () => {
    configured = false;
    render(<SignInForm />);

    expect(screen.getByText(/not configured for this deployment/i)).toBeDefined();
  });

  it('reports a send that failed', async () => {
    signInWithOtp.mockResolvedValue({ error: { message: 'nope' } } as never);

    render(<SignInForm />);
    await userEvent.type(screen.getByLabelText(/email/i), 'player@nonet.test');
    await userEvent.click(screen.getByRole('button', { name: /send the code/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeDefined());
  });
});
