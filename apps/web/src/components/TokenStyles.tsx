import { stylesheet } from '@nonet/design';

/**
 * Injects the design tokens as custom properties.
 *
 * Emitted from `@nonet/design` at render rather than checked in as a generated
 * stylesheet, so the CSS can never drift from the tokens the tests enforce.
 * It belongs in the root layout, before anything that reads a `var(--…)`.
 */
export function TokenStyles() {
  return <style data-nonet-tokens dangerouslySetInnerHTML={{ __html: stylesheet() }} />;
}
