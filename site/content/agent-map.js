import fs from 'node:fs';
import path from 'node:path';

/* Build-time facts for the homepage.
 *
 * The integration panel is not transcribed by hand — it is READ from
 * examples/agent-map/agent-map.ts, the same file the repo's `npm run typecheck`
 * gate compiles (tsconfig.test.json includes examples/, and maps the bare
 * 'hcifootprint' specifier onto src/). If that file stops compiling, CI fails;
 * if it changes shape, the line count on this page changes with it. The page
 * cannot claim a number the file does not have.
 *
 * The version badge is read from the library's own package.json for the same
 * reason: one source of truth, no hand-copied constant to go stale.
 */

const repoRoot = path.join(process.cwd(), '..');

const SOURCE = fs
  .readFileSync(path.join(repoRoot, 'examples', 'agent-map', 'agent-map.ts'), 'utf8')
  .replace(/\n$/, '');

export const version = JSON.parse(
  fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
).version;

const KEYWORDS = /('[^']*')|\b(import|from|export|const|type)\b/g;

/** One line → [{ t, c }] tokens; `c` is the CSS class, or null for plain text. */
function tokenize(line) {
  if (/^\s*\/\//.test(line)) return [{ t: line, c: 'cm' }];
  const out = [];
  let last = 0;
  let m;
  KEYWORDS.lastIndex = 0;
  while ((m = KEYWORDS.exec(line)) !== null) {
    if (m.index > last) out.push({ t: line.slice(last, m.index), c: null });
    out.push({ t: m[0], c: m[1] ? 'str' : 'kw' });
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push({ t: line.slice(last), c: null });
  return out.length ? out : [{ t: '', c: null }];
}

const lines = SOURCE.split('\n');

export const code = lines.map(tokenize);

/** The honest count: the file exactly as the panel renders it. */
export const lineCount = lines.length;

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function words(n) {
  if (n < 20) return ONES[n];
  const t = TENS[Math.floor(n / 10)];
  const r = n % 10;
  return r ? `${t}-${ONES[r]}` : t;
}

/** "Twenty-eight" — the heading says the same number the panel does. */
export const lineWord = (() => {
  const w = words(lineCount);
  return w.charAt(0).toUpperCase() + w.slice(1);
})();
