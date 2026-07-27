import { afterEach, describe, expect, it } from 'vitest';
import { THEME_KEY, THEME_SCRIPT, type ThemeChoice } from '../src/lib/theme';

/**
 * The token sheet emits light on :root, dark under prefers-color-scheme and
 * both [data-theme] overrides, so an explicit choice wins in either direction
 * (NONET-6). That only holds if the attribute is on <html> before first paint —
 * set it in an effect and a player who chose light gets a dark flash on every
 * load, which is the one way the token sheet can still be defeated.
 */
function runScript(): void {
  new Function(THEME_SCRIPT)();
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  window.localStorage.clear();
});

describe('the pre-hydration theme script', () => {
  it.each<ThemeChoice>(['light', 'dark'])('stamps an explicit %s choice on <html>', (choice) => {
    window.localStorage.setItem(THEME_KEY, choice);
    runScript();
    expect(document.documentElement.getAttribute('data-theme')).toBe(choice);
  });

  it('leaves no attribute for system, so the media query decides', () => {
    window.localStorage.setItem(THEME_KEY, 'system');
    runScript();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('leaves no attribute when nothing is stored', () => {
    runScript();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('ignores a stored value that is not a theme', () => {
    window.localStorage.setItem(THEME_KEY, 'cobalt');
    runScript();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('survives localStorage throwing, rather than blocking first paint', () => {
    const real = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('denied', 'SecurityError');
      },
    });
    try {
      expect(() => runScript()).not.toThrow();
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    } finally {
      if (real !== undefined) Object.defineProperty(window, 'localStorage', real);
    }
  });

  it('contains no closing script tag that would break the inline block', () => {
    expect(THEME_SCRIPT).not.toContain('</script');
  });
});
