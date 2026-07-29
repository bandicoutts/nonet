/**
 * Generates the app icons from the wordmark and the design tokens.
 *
 * The mark is the wordmark's own `N` — Archivo, bold, the same face
 * `type-wordmark` names — on the app's own ground. Nothing here is invented:
 * the colours are read from `@nonet/design` rather than typed in, so a palette
 * change is a re-run rather than a redraw. (The wordmark's -0.045em tracking
 * has no effect on a single glyph, so it is not applied.)
 *
 * **The icon cannot follow the theme.** It is one fixed image, so it uses the
 * dark ground: a dark tile is legible on light and dark home screens alike,
 * and it matches the splash colour in `manifest.ts`, so install and launch
 * agree rather than flashing between two grounds.
 *
 * Run: `pnpm --filter @nonet/web icons:gen`. Checked-in output rather than a
 * build step, the same arrangement as `gen-theme.ts` — the diff is reviewable
 * when the mark or a colour moves.
 *
 * Archivo is fetched rather than vendored — it is OFL, and `next/font` already
 * ships the same family to the browser. Fontconfig is pointed at a directory
 * holding only that file, so the glyph drawn is provably Archivo and never a
 * system fallback.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { palettes } from '@nonet/design';

const ARCHIVO =
  'https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf';

const GROUND = palettes.dark['--bg'];
const INK = palettes.dark['--fg'];

/**
 * Every icon this app ships, and why each exists.
 *
 * `inset` is the share of the canvas left empty around the glyph. Maskable
 * icons are cropped to a circle by the platform, so their content has to sit
 * inside the middle 80% — everything else can breathe less.
 */
const ICONS = [
  { file: '../src/app/icon.png', size: 512, inset: 0.18, why: 'link rel=icon' },
  { file: '../src/app/apple-icon.png', size: 180, inset: 0.14, why: 'iOS home screen' },
  { file: '../public/icons/icon-192.png', size: 192, inset: 0.18, why: 'manifest, any' },
  { file: '../public/icons/icon-512.png', size: 512, inset: 0.18, why: 'manifest, any' },
  { file: '../public/icons/maskable-192.png', size: 192, inset: 0.28, why: 'manifest, maskable' },
  { file: '../public/icons/maskable-512.png', size: 512, inset: 0.28, why: 'manifest, maskable' },
];

/** The wordmark's N, centred, sized to fill the canvas minus its inset. */
function markSvg(size: number, inset: number): string {
  const box = size * (1 - inset * 2);
  // Cap height rather than em size: Archivo's caps are ~0.72em, so this makes
  // the letter itself the measured thing rather than the invisible box.
  const fontSize = box / 0.72;
  const baseline = size / 2 + box / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${GROUND}"/>
  <text x="${size / 2}" y="${baseline}" font-family="Archivo" font-size="${fontSize}" font-weight="700" fill="${INK}" text-anchor="middle">N</text>
</svg>`;
}

/**
 * A 32px PNG wrapped in an ICO container.
 *
 * Only for `/favicon.ico`, which crawlers and old clients request by path
 * whatever the markup says. PNG-encoded ICO is understood by everything since
 * IE11, and sharp cannot write ICO itself — the container is six fields.
 */
function ico(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0);
  entry.writeUInt8(size === 256 ? 0 : size, 1);
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

async function fontDir(): Promise<string> {
  const dir = join(tmpdir(), 'nonet-icon-fonts');
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const response = await fetch(ARCHIVO);
  if (!response.ok) throw new Error(`Archivo download failed: ${response.status}`);
  await writeFile(join(dir, 'Archivo.ttf'), Buffer.from(await response.arrayBuffer()));

  const conf = join(tmpdir(), 'nonet-icon-fonts.conf');
  await writeFile(
    conf,
    `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${dir}</dir><cachedir>${join(tmpdir(), 'nonet-icon-fontcache')}</cachedir></fontconfig>`,
  );
  return conf;
}

const here = fileURLToPath(new URL('.', import.meta.url));
const conf = await fontDir();

// Set before the first render: fontconfig is read once, on demand.
process.env['FONTCONFIG_FILE'] = conf;

await mkdir(join(here, '../public/icons'), { recursive: true });

for (const { file, size, inset, why } of ICONS) {
  const png = await sharp(Buffer.from(markSvg(size, inset))).png().toBuffer();
  await writeFile(join(here, file), png);
  console.log(`${file.replace('../', '')} — ${size}x${size} (${why})`);
}

const favicon = await sharp(Buffer.from(markSvg(32, 0.12))).png().toBuffer();
await writeFile(join(here, '../src/app/favicon.ico'), ico(favicon, 32));
console.log('src/app/favicon.ico — 32x32 (PNG-in-ICO)');
