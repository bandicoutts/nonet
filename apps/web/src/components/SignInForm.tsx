'use client';

import { useState } from 'react';
import Link from 'next/link';
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
 * Magic link, and nothing else.
 *
 * No password to create, forget or reset — which also means no password for
 * this product to hold. Copy is verbatim from `design/export/copy.md`,
 * including the fifteen-minute expiry, which `config.toml` is set to keep.
 *
 * Signing in is optional everywhere, so this is a convenience rather than a
 * gate: a player who never uses it loses nothing but sync.
 */
export function SignInForm({ next = '/' }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'form' | 'sending' | 'sent' | 'error'>('form');

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
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // The whitelist runs again in the callback; this is belt and braces
        // rather than the check itself.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          safeRedirect(next),
        )}`,
      },
    });
    setState(error ? 'error' : 'sent');
  };

  if (state === 'sent') {
    return (
      <div className="flex max-w-[52ch] flex-col gap-s">
        <h1 className="type-display text-fg">Check your email</h1>
        <p className="type-body text-fg2">
          A sign-in link is on its way to {email}. It expires in fifteen minutes.
        </p>

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
        We send a link, you click it. No password to forget. Your streak and stats then follow you
        between devices.
      </p>

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
          Send the link
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
