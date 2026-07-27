# @nonet/design

Placeholder. Design tokens are the single source of truth for styling and are
transcribed from the Claude Design prototype's **Tokens** screen in **Phase 2**
— see [`docs/ROADMAP.md`](../../docs/ROADMAP.md).

Never hardcode colours or spacing in components; import from here.

## `--fg3` is split — apply this when transcribing

The prototype's `--fg3` failed WCAG AA in nine foreground/background pairings
across both themes, because one token carried four different jobs. Resolved in
[DECISIONS.md NONET-5](../../docs/DECISIONS.md):

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--fg3` | `#6C7278` | `#8B9298` | Disabled and spent states **only** — WCAG-exempt |
| `--fg3-text` | `#5A5F65` | `#A0A6AA` | Captions, mono kickers, metadata, inactive states, **note text** |

Do not transcribe `--fg3` from `design/export/tokens.json` as a single value.
The contrast figures in that file describe the exported prototype and are left
as measured; these are the values to build.
