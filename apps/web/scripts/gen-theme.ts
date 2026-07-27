/**
 * Writes the Tailwind layer from the design tokens.
 *
 * Checked-in output rather than a build step, so the CSS pipeline stays plain
 * and the diff is reviewable when a token moves. `test/theme-layer.test.ts`
 * fails if the committed file and the tokens disagree, which is what stops it
 * going stale — the same arrangement as the engine's `calibrate` script.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tailwindLayer } from '@nonet/design';

const target = fileURLToPath(new URL('../src/app/theme.generated.css', import.meta.url));
writeFileSync(target, tailwindLayer(), 'utf8');
process.stdout.write(`wrote ${target}\n`);
