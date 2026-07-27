/**
 * Type roles, transcribed from `design/export/tokens.json` → `type`.
 *
 * The Tokens screen is the authority where it and the product disagree; the
 * export's `_discrepancies` list is carried into the notes below so the
 * off-role renderings are visible rather than quietly reproduced.
 */
import { atViewport } from './viewports.js';
import type { Responsive, Viewport } from './viewports.js';

export const FAMILIES = {
  sans: 'Archivo',
  mono: 'IBM Plex Mono',
} as const;

export const WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export type FamilyName = keyof typeof FAMILIES;

/** Roles where the weight depends on what the text is, not where it is. */
export type WeightVariants = Readonly<Record<string, number>>;

export interface TypeRole {
  readonly family: FamilyName;
  readonly weight: number | WeightVariants;
  readonly size: number | Responsive<number>;
  readonly lineHeight: string | Responsive<string>;
  readonly letterSpacing: string | Responsive<string>;
  readonly case: 'sentence' | 'uppercase' | 'uppercase-literal' | 'none';
  /** Tabular figures, so numbers do not jitter as they change. */
  readonly tabular: boolean;
  readonly note?: string;
}

export const TYPE_ROLES = {
  display: {
    family: 'sans',
    weight: WEIGHTS.semibold,
    size: { 390: 32, 834: 44, 1440: 56 },
    lineHeight: '1.02',
    letterSpacing: '-0.04em',
    case: 'sentence',
    tabular: false,
  },
  'hero-number': {
    family: 'sans',
    weight: WEIGHTS.semibold,
    size: { 390: 64, 834: 92, 1440: 124 },
    lineHeight: '0.84',
    letterSpacing: '-0.05em',
    case: 'none',
    tabular: true,
  },
  'result-number': {
    family: 'sans',
    weight: WEIGHTS.semibold,
    size: { 390: 54, 834: 82, 1440: 116 },
    lineHeight: '0.86',
    letterSpacing: '-0.05em',
    case: 'none',
    tabular: true,
  },
  'streak-number': {
    family: 'sans',
    weight: WEIGHTS.semibold,
    size: { 390: 34, 834: 54, 1440: 54 },
    lineHeight: '1',
    letterSpacing: '-0.04em',
    case: 'none',
    tabular: true,
  },
  timer: {
    family: 'sans',
    weight: WEIGHTS.semibold,
    size: { 390: 22, 834: 30, 1440: 44 },
    lineHeight: '1',
    letterSpacing: { 390: '-0.03em', 834: '-0.03em', 1440: '-0.035em' },
    case: 'none',
    tabular: true,
  },
  'stat-number': {
    family: 'sans',
    weight: WEIGHTS.semibold,
    size: { 390: 30, 834: 38, 1440: 38 },
    lineHeight: '1',
    letterSpacing: '-0.035em',
    case: 'none',
    tabular: true,
  },
  'month-number': {
    family: 'sans',
    weight: WEIGHTS.semibold,
    size: { 390: 26, 834: 32, 1440: 38 },
    lineHeight: '1',
    letterSpacing: '-0.035em',
    case: 'none',
    tabular: false,
    note: 'Archive month label. Not on the Tokens screen; a distinct step in practice.',
  },
  'cell-digit': {
    family: 'sans',
    weight: { given: WEIGHTS.semibold, entry: WEIGHTS.regular },
    size: { 390: 18, 834: 36, 1440: 38 },
    lineHeight: '1',
    letterSpacing: '0',
    case: 'none',
    tabular: true,
    note: 'Computed as round(cellSize * 0.47). Givens are semibold, player entries regular — the design language pairs that with --accent for entries.',
  },
  wordmark: {
    family: 'sans',
    weight: WEIGHTS.bold,
    size: { 390: 16, 834: 22, 1440: 22 },
    lineHeight: '1',
    letterSpacing: '-0.045em',
    case: 'uppercase-literal',
    tabular: false,
    note: 'The wordmark is literally uppercase in the markup, not transformed.',
  },
  'cell-note': {
    family: 'sans',
    weight: WEIGHTS.regular,
    size: { 390: 9, 834: 14, 1440: 15 },
    lineHeight: { 390: '10px', 834: '21px', 1440: '22px' },
    letterSpacing: '0.06em',
    case: 'none',
    tabular: false,
    note: 'Computed as max(9, round(cellSize * 0.185)) over floor(cellSize / 3.6). Renders in --fg3-text; at 9px this is the smallest text in the product, which is why its contrast drove NONET-5.',
  },
  body: {
    family: 'sans',
    weight: WEIGHTS.regular,
    size: 15,
    lineHeight: '1.65',
    letterSpacing: '0',
    case: 'sentence',
    tabular: false,
    note: 'Long-form pages render 16/1.7 and 16/1.75 — off-role in the prototype.',
  },
  'body-small': {
    family: 'sans',
    weight: WEIGHTS.regular,
    size: 13,
    lineHeight: '1.6',
    letterSpacing: '0',
    case: 'sentence',
    tabular: false,
    note: '12/1.5, 12/1.6, 12/1.7, 11/1.5 and 14/1.65 also appear — off-role in the prototype.',
  },
  control: {
    family: 'mono',
    weight: WEIGHTS.medium,
    size: { 390: 10, 834: 11, 1440: 11 },
    lineHeight: '1',
    letterSpacing: { 390: '0.04em', 834: '0.13em', 1440: '0.13em' },
    case: 'uppercase',
    tabular: false,
    note: 'The Tokens screen publishes a flat 11px/.13em; the product renders 10px/.04em at 390. Per-viewport values kept, because the 390 layout was drawn around them.',
  },
  kicker: {
    family: 'mono',
    weight: WEIGHTS.medium,
    size: 11,
    lineHeight: '1',
    letterSpacing: '0.22em',
    case: 'uppercase',
    tabular: false,
    note: 'The Solved header kicker renders 10px at .12em/.18em — off-token. The Tokens screen wins.',
  },
  'mono-label': {
    family: 'mono',
    weight: WEIGHTS.medium,
    size: 10,
    lineHeight: '1',
    letterSpacing: '0.18em',
    case: 'uppercase',
    tabular: false,
    note: 'Also rendered at .12em, .14em, .16em and .2em in the prototype — snap to .18em.',
  },
  'mono-data': {
    family: 'mono',
    weight: WEIGHTS.regular,
    size: 12,
    lineHeight: '1.7',
    letterSpacing: '0.02em',
    case: 'none',
    tabular: true,
    note: 'Data rows render 12/1 or 11/1 with no tracking — off-role in the prototype.',
  },
  chip: {
    family: 'mono',
    weight: WEIGHTS.medium,
    size: 10,
    lineHeight: '1',
    letterSpacing: '0.12em',
    case: 'uppercase',
    tabular: false,
    note: 'Not on the Tokens screen. Every chip uses it. Differs from mono-label only in tracking.',
  },
  button: {
    family: 'mono',
    weight: WEIGHTS.semibold,
    size: 12,
    lineHeight: '1',
    letterSpacing: '0.16em',
    case: 'uppercase',
    tabular: false,
    note: 'Not on the Tokens screen. Home hero buttons render 13px and dialog buttons 11px — off-role.',
  },
} as const satisfies Record<string, TypeRole>;

export type TypeRoleName = keyof typeof TYPE_ROLES;

export interface ResolvedType {
  readonly fontFamily: string;
  readonly weight: number;
  readonly size: number;
  readonly lineHeight: string;
  readonly letterSpacing: string;
  readonly case: TypeRole['case'];
  readonly tabular: boolean;
}

/**
 * Flatten a role at a viewport. `variant` picks a weight for roles whose weight
 * depends on the content — currently only `cell-digit`, which is semibold as a
 * given and regular as a player entry.
 */
export function resolveType(
  name: TypeRoleName,
  viewport: Viewport,
  variant?: string,
): ResolvedType {
  const role: TypeRole = TYPE_ROLES[name];

  const weight =
    typeof role.weight === 'number'
      ? role.weight
      : (role.weight[variant ?? Object.keys(role.weight)[0] ?? ''] ??
        Object.values(role.weight)[0] ??
        WEIGHTS.regular);

  return {
    fontFamily: FAMILIES[role.family],
    weight,
    size: atViewport(role.size, viewport),
    lineHeight: atViewport(role.lineHeight, viewport),
    letterSpacing: atViewport(role.letterSpacing, viewport),
    case: role.case,
    tabular: role.tabular,
  };
}
