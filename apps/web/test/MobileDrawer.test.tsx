import { afterEach, describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileDrawer } from '../src/components/chrome/MobileDrawer';
import { DEFAULT_SETTINGS, readSettings } from '../src/lib/settings';

afterEach(() => {
  window.localStorage.clear();
  document.body.style.overflow = '';
});

const open = async () => {
  const user = userEvent.setup();
  render(<MobileDrawer email={null} />);
  await user.click(screen.getByRole('button', { name: /menu/i }));
  return user;
};

/**
 * The drawer is a full-frame overlay, not a side sheet — "an editorial contents
 * page, not a borrowed app pattern" (DESIGN.md). The prototype designs how it
 * looks; the semantics below are entirely the build's, because the design
 * runtime renders every control as a span and cannot express any of them.
 */
describe('the menu trigger', () => {
  test('is a button that says what it does', () => {
    render(<MobileDrawer email={null} />);
    expect(screen.getByRole('button', { name: /menu/i })).toBeDefined();
  });

  test('says whether the drawer is open', async () => {
    const user = await open();
    expect(screen.getByRole('button', { name: /menu/i }).getAttribute('aria-expanded')).toBe('true');

    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: /menu/i }).getAttribute('aria-expanded')).toBe('false');
  });

  test('is hidden from screen readers as decoration, not as a control', () => {
    render(<MobileDrawer email={null} />);
    // The three hairlines are the product's own rule language, but they are a
    // picture of a menu, not a label for one.
    const trigger = screen.getByRole('button', { name: /menu/i });
    expect(trigger.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('the drawer', () => {
  test('is a modal dialog', async () => {
    await open();
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  test('carries both navs, in the order the design gives them', async () => {
    await open();

    const primary = screen.getByRole('navigation', { name: /primary/i });
    expect(within(primary).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Today',
      'Archive',
      'Record',
    ]);

    const secondary = screen.getByRole('navigation', { name: /secondary/i });
    expect(within(secondary).getAllByRole('link').map((a) => a.textContent)).toEqual([
      'Settings',
      'How to play',
      'About',
    ]);
  });

  test('closes on Escape and gives focus back to the trigger', async () => {
    const user = await open();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /menu/i }));
  });

  test('closes on the Close control', async () => {
    const user = await open();
    await user.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  test('takes focus when it opens, so a keyboard player is inside it', async () => {
    await open();
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  /**
   * Tab has to cycle *within* the drawer. Without this, tabbing walks out into
   * a page the player cannot see and cannot get back from.
   */
  test('traps Tab inside itself', async () => {
    const user = await open();
    const dialog = screen.getByRole('dialog');

    for (let i = 0; i < 12; i += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  test('traps Shift+Tab too', async () => {
    const user = await open();
    const dialog = screen.getByRole('dialog');

    for (let i = 0; i < 12; i += 1) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  test('stops the page scrolling behind it', async () => {
    const user = await open();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });
});

describe('the theme control', () => {
  test('offers the three choices', async () => {
    await open();
    const group = screen.getByRole('group', { name: /theme/i });
    expect(within(group).getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Light',
      'Dark',
      'System',
    ]);
  });

  test('names the control, never the action', async () => {
    // DESIGN.md: the label always names the control. A button reading "Dark"
    // is the choice, not an instruction, so pressed state carries the current
    // value.
    await open();
    const group = screen.getByRole('group', { name: /theme/i });
    const system = within(group).getByRole('button', { name: 'System' });
    expect(system.getAttribute('aria-pressed')).toBe('true');
  });

  test('applies and persists a choice', async () => {
    const user = await open();
    const group = screen.getByRole('group', { name: /theme/i });

    await user.click(within(group).getByRole('button', { name: 'Dark' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(readSettings().theme).toBe('dark');
  });

  test('keeps every other setting when the theme changes', async () => {
    const user = await open();
    await user.click(
      within(screen.getByRole('group', { name: /theme/i })).getByRole('button', { name: 'Light' }),
    );

    expect(readSettings()).toEqual({ ...DEFAULT_SETTINGS, theme: 'light' });
  });
});

describe('the account block', () => {
  test('tells a guest where their progress actually is', async () => {
    await open();
    expect(screen.getByText(/progress is kept in this browser only/i)).toBeDefined();
    expect(screen.getByRole('link', { name: /sign in/i })).toBeDefined();
  });

  test('names the account when there is one', async () => {
    const user = userEvent.setup();
    render(<MobileDrawer email="player@nonet.test" />);
    await user.click(screen.getByRole('button', { name: /menu/i }));

    expect(screen.getByText('player@nonet.test')).toBeDefined();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeDefined();
  });

  /**
   * The default scope revokes every session on every device, which is almost
   * never what a player means by signing out of one browser.
   */
  test('signs out of this browser only', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const user = userEvent.setup();

    render(<MobileDrawer email="player@nonet.test" signOut={signOut} />);
    await user.click(screen.getByRole('button', { name: /menu/i }));
    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
