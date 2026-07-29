'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { safeRedirect } from '@/lib/redirect';

const INPUT =
  'type-body min-h-[52px] w-full border border-line bg-surface px-s text-fg ' +
  'placeholder:text-fg3 ' +
  'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset)';

const SUBMIT =
  'type-button min-h-[52px] cursor-pointer border-0 bg-fg px-l text-bg ' +
  'transition-colors duration-(--motion-hover) ease-(--ease-hover) ' +
  'hover:bg-accent hover:text-accent-ink ' +
  'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent) ' +
  'disabled:cursor-default disabled:bg-fg3';

const LINK = 'type-body-small text-fg2 underline underline-offset-4 hover:text-fg';

/**
 * A six-digit code, and nothing else.
 *
 * No password to create, forget or reset — which also means no password for
 * this product to hold, and no reset flow, which would itself have been a
 * magic link.
 *
 * **A code rather than a link, which reverses NONET-18.** The only thing an
 * account does here is carry a streak between devices, so the moment someone
 * signs in is very often on their *second* device — and that is exactly where
 * a link fails. It opens in whatever browser the mail app owns rather than the
 * tab the player started in, so they end up authenticated somewhere they were
 * not playing. Mail gateways that prefetch links also spend the single-use
 * token before any human clicks it. A code has neither failure: the player
 * stays where they are and types six digits. DECISIONS.md NONET-21.
 *
 * Signing in is optional everywhere, so this is a convenience rather than a
 * gate: a player who never uses it loses nothing but sync.
 */
export function SignInForm({ next = '/', problem = null }: { next?: string; problem?: string | null }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'sent' | 'verifying' | 'error' | 'bad-code'>(
    'form',
  );

  const router = useRouter();
  const supabase = createClient();

  if (supabase === null) {
    return (
      <p className="type-body max-w-[52ch] text-fg2">
        Sign-in is not configured for this deployment. Everything else works — progress is saved in
        this browser either way.
      </p>
    );
  }

  const send = async () => {
    setState('sending');
    // No `emailRedirectTo`: nothing is being redirected. The player stays in
    // this tab, which is the entire point of the code.
    const { error } = await supabase.auth.signInWithOtp({ email });
    setState(error ? 'error' : 'sent');
  };

  const verify = async () => {
    setState('verifying');
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });

    if (error) {
      // Six digits typed by hand against a fifteen-minute window: a wrong or
      // expired code is ordinary. Stay put and let them try again.
      setState('bad-code');
      return;
    }

    /*
     * `merged=1` is what raises the post-sign-in summary, and the merge is what
     * signing in is *for*. The link flow got this marker from the callback
     * route; a code never touches the server, so it has to be added here —
     * without it, signing in would silently stop carrying a guest's history.
     *
     * `next` is attacker-controlled and now reaches a client-side navigation
     * rather than the callback's server-side one, so it still goes through the
     * whitelist. The session is live by this line, which is the worst possible
     * moment for an open redirect (NONET-18).
     */
    const destination = safeRedirect(next);
    router.replace(`${destination}${destination.includes('?') ? '&' : '?'}merged=1`);
  };

  if (state !== 'form' && state !== 'sending' && state !== 'error') {
    return (
      <div className="flex max-w-[52ch] flex-col gap-s">
        <h1 className="type-display text-fg">Check your email</h1>
        <p className="type-body text-fg2">
          A six-digit code is on its way to {email}. It expires in fifteen minutes.
        </p>

        <form
          className="mt-s flex flex-col gap-s"
          onSubmit={(event) => {
            event.preventDefault();
            void verify();
          }}
        >
          <label className="type-mono-label text-fg3-text" htmlFor="code">
            Code
          </label>
          <input
            id="code"
            className={`${INPUT} tracking-[0.3em] tabular-nums`}
            name="code"
            /* Typed for what it is, so a password manager does not offer a
               password and iOS offers the code it has just received. */
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            required
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
          />

          <button className={SUBMIT} type="submit" disabled={state === 'verifying'}>
            Sign in
          </button>

          {state === 'bad-code' ? (
            <p className="type-body-small text-error" role="alert">
              That code did not work. Check it, or send another.
            </p>
          ) : null}
        </form>

        <div className="mt-s flex flex-wrap items-center gap-s">
          <button type="button" className={LINK} onClick={() => void send()}>
            Send again
          </button>
          <span aria-hidden="true" className="type-body-small text-fg3">
            ·
          </span>
          <Link href="/" className={LINK}>
            Keep playing as a guest
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-[42ch] flex-col gap-s">
      <h1 className="type-display text-fg">Sign in</h1>
      <p className="type-body text-fg2">
        We send a six-digit code. No password to forget. Your streak and stats then follow you
        between devices.
      </p>

      {/* Above the form, because it explains why the player is back here. */}
      {problem === null ? null : (
        <p className="type-body-small text-error" role="alert">
          {problem}
        </p>
      )}

      <form
        className="mt-s flex flex-col gap-s"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <label className="type-mono-label text-fg3-text" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className={INPUT}
          type="email"
          name="email"
          placeholder="you@example.com"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <button className={SUBMIT} type="submit" disabled={state === 'sending'}>
          Send the code
        </button>

        {state === 'error' ? (
          <p className="type-body-small text-error" role="alert">
            That did not send. Try again in a moment.
          </p>
        ) : null}
      </form>

      <p className="type-body-small text-fg3-text">
        You can keep playing as a guest — progress is saved in this browser either way.
      </p>
    </div>
  );
}
