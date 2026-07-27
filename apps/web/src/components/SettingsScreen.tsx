'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { DEFAULT_SETTINGS, readSettings, writeSettings } from '@/lib/settings';
import type { Settings } from '@/lib/settings';
import { THEME_CHOICES, readTheme, writeTheme } from '@/lib/theme';
import type { ThemeChoice } from '@/lib/theme';

const CHIP =
  'type-chip inline-flex min-h-(--tap-target-min) cursor-pointer items-center border px-s ' +
  'transition-colors duration-(--motion-hover) ease-(--ease-hover) ' +
  'focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset)';

const CHIP_ON = 'border-accent bg-accent text-accent-ink';
const CHIP_OFF = 'border-line bg-transparent text-fg3-text hover:text-fg';
const CHIP_DEAD = 'border-line bg-transparent text-fg3 opacity-[.62] cursor-default';

/**
 * Settings.
 *
 * The store, the columns and the sync shape have existed since NONET-17; what
 * was missing was anywhere to change them, and four of the seven were being
 * stored and synced while **no component read them** (OPEN-QUESTIONS #2). This
 * is half of closing that — the board reading them is the other half.
 *
 * Every change is written immediately. There is no Save button because there is
 * nothing to batch: each setting is independent, and the copy promises "every
 * change applies to the next cell you touch".
 */
export function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<ThemeChoice>('system');

  /* Read in an effect: no localStorage on the server (NONET-15). */
  useEffect(() => {
    setSettings(readSettings());
    setTheme(readTheme());
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      writeSettings(next);
      return next;
    });
  }, []);

  /*
   * Theme is written twice, deliberately.
   *
   * It lives in the settings blob so it syncs with everything else, and under
   * its own key because a blocking inline script reads it before first paint to
   * stop an explicit light choice flashing dark on a dark device — and that
   * script cannot parse a JSON object (NONET-11). The two must move together.
   */
  const chooseTheme = useCallback(
    (choice: ThemeChoice) => {
      setTheme(choice);
      // `writeTheme` sets the attribute as well as storing it, so the two
      // cannot drift apart.
      writeTheme(choice);
      update({ theme: choice });
    },
    [update],
  );

  return (
    <section className="mx-auto flex w-full max-w-[52rem] flex-col gap-l px-m py-l drawer:px-2xl rail:px-4xl">
      <header className="flex flex-col gap-s">
        <p className="type-kicker text-fg3-text">Settings</p>
        <h1 className="type-display text-fg">How you play.</h1>
        <p className="type-body text-fg2 max-w-[52ch]">
          Every change applies to the next cell you touch. Nothing here is hidden behind a second
          screen.
        </p>
        <p className="type-body-small text-fg3-text max-w-[52ch]">
          Settings are kept in this browser. Sign in and they follow you, along with the streak.
        </p>
      </header>

      <dl className="flex flex-col">
        <Row label="Theme" description="Light, dark, or whatever the system is doing.">
          {THEME_CHOICES.map((choice) => (
            <button
              key={choice}
              type="button"
              aria-pressed={theme === choice}
              onClick={() => chooseTheme(choice)}
              className={`${CHIP} ${theme === choice ? CHIP_ON : CHIP_OFF}`}
            >
              {choice === 'system' ? 'System' : choice === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </Row>

        <Row
          label="Input"
          description="Cell → digit: pick a cell, then its digit. Digit → cells: pick a digit once, then tap every cell that takes it."
        >
          {(['cellFirst', 'digitFirst'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={settings.inputMode === mode}
              onClick={() => update({ inputMode: mode })}
              className={`${CHIP} ${settings.inputMode === mode ? CHIP_ON : CHIP_OFF}`}
            >
              {mode === 'cellFirst' ? 'Cell → digit' : 'Digit → cells'}
            </button>
          ))}
        </Row>

        <Row
          label="Auto-advance"
          description="After a digit is placed, move to the next empty cell in reading order. Cell first only."
        >
          {/* Cell-first only, and the copy says so — so in digit-first it is
              shown inert rather than hidden. A control that vanishes reads as a
              bug; one that is visibly unavailable explains itself. */}
          <Toggle
            label="Advance"
            on={settings.autoAdvance}
            disabled={settings.inputMode === 'digitFirst'}
            onToggle={() => update({ autoAdvance: !settings.autoAdvance })}
          />
        </Row>

        <Row
          label="Checking"
          description="Flag a wrong digit the moment it is entered, and count it. Off means no flags, no mistake tally, and no percentile."
        >
          <Toggle
            label="Checking"
            on={settings.checking}
            onToggle={() => update({ checking: !settings.checking })}
          />
        </Row>

        <Row
          label="Highlight matching digits"
          description="Shade every cell holding the same digit as the selected cell."
        >
          <Toggle
            label="Matching"
            on={settings.highlightMatching}
            onToggle={() => update({ highlightMatching: !settings.highlightMatching })}
          />
        </Row>

        <Row
          label="Highlight row, column and box"
          description="Shade the three units the selected cell belongs to."
        >
          <Toggle
            label="Units"
            on={settings.highlightUnits}
            onToggle={() => update({ highlightUnits: !settings.highlightUnits })}
          />
        </Row>

        <Row
          label="Show timer"
          description="Hide it while you play; the time is still recorded and shown at the end."
        >
          <Toggle
            label="Timer"
            on={settings.showTimer}
            onToggle={() => update({ showTimer: !settings.showTimer })}
          />
        </Row>
      </dl>

      <div className="flex flex-col gap-s border-t border-rule pt-m">
        <p className="type-mono-label text-fg3-text">Account</p>
        <p className="type-body text-fg">Playing as a guest</p>
        <p className="type-body-small text-fg3-text">Progress is kept in this browser only.</p>
        <Link
          href="/auth"
          className="type-button inline-flex min-h-(--tap-target-min) w-fit items-center border border-fg px-l text-fg no-underline transition-colors duration-(--motion-hover) ease-(--ease-hover) hover:bg-hover focus-visible:outline-(--border-focus-ring) focus-visible:outline-offset-(--focus-offset-prominent)"
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}

/**
 * A settings row.
 *
 * `components.md` has every row stacking at 390 and records that only Input
 * actually does, calling the inconsistency a defect. Built as it was meant to
 * be: all of them stack below the drawer breakpoint.
 */
function Row({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    /* `dt` and `dd` sit directly inside this wrapper, which is the only
       structure a definition list permits — nesting them inside a further div
       for layout makes them orphans that no assistive technology pairs up. */
    <div className="flex flex-col gap-s border-b border-line py-m drawer:flex-row drawer:items-center drawer:justify-between drawer:gap-l">
      <dt className="type-body text-fg max-w-[46ch]">
        {label}
        <span className="type-body-small text-fg3-text mt-2xs block font-normal">
          {description}
        </span>
      </dt>
      <dd className="flex flex-wrap gap-2xs">{children}</dd>
    </div>
  );
}

/**
 * A single on/off control.
 *
 * `aria-pressed` rather than a checkbox role, because it is drawn as a chip that
 * is either active or not — and `aria-disabled` rather than `disabled`, so a
 * keyboard player can still reach it and hear why it is unavailable (NONET-10).
 */
function Toggle({
  label,
  on,
  disabled = false,
  onToggle,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onToggle();
      }}
      className={`${CHIP} ${disabled ? CHIP_DEAD : on ? CHIP_ON : CHIP_OFF}`}
    >
      {label}
    </button>
  );
}
