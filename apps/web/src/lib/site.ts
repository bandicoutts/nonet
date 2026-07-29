/**
 * Where this product lives.
 *
 * One constant, because the address appears in text a player copies out of the
 * app and sends to someone else — and a shared result that points at nothing is
 * worse than one with no link at all, since it reads as a broken product rather
 * than a plain score. It was `nonet.app` inline in `shareText`, a domain the
 * project does not own (NONET-30), so every result ever shared pointed nowhere.
 *
 * **The Vercel address is the real one, not a placeholder.** A custom domain
 * would change this line and nothing else, which is the whole reason it is a
 * constant rather than a literal at each use.
 *
 * It points at the site root on purpose. A recipient has no solve in their
 * storage, so `/solved` would give them a blank frame and an immediate redirect
 * to Home — the link may as well go there directly.
 */
export const SITE_URL = 'https://nonet-nine.vercel.app';
