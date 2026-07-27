import { stylesheet } from '@nonet/design';

/**
 * Injects the design tokens as custom properties.
 *
 * Emitted from `@nonet/design` at render rather than checked in as a generated
 * stylesheet, so the CSS can never drift from the tokens the tests enforce.
 * It belongs in the root layout, before anything that reads a `var(--…)`.
 *
 * `href` and `precedence` let React 19 hoist this into `<head>` and dedupe it,
 * so the tokens are defined in the document head even though the component is
 * rendered inside the body.
 */
export function TokenStyles() {
  return (
    <style href="nonet-tokens" precedence="tokens" dangerouslySetInnerHTML={{ __html: stylesheet() }} />
  );
}
