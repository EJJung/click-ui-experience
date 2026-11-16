/**
 * Pure helpers behind `.scripts/js/check-tokens` (`yarn tokens:check`).
 *
 * Three checks, all read-only:
 *
 *   1. Undefined references: every `var(--name)` in a component stylesheet must
 *      resolve to a generated token or to a custom property the library itself
 *      declares (in CSS or as an inline `style` key in TSX). Zero tolerance.
 *   2. Tier leaks: a component colour token in `tokens/themes/{light,dark}.json`
 *      that aliases `{palette.*}` directly, or holds a raw value, skips the
 *      semantic tier, so a theme change made there never reaches it.
 *   3. Theme parity: a token path that exists in one theme but not the other.
 *
 * Checks 2 and 3 are existing debt. They are frozen in `token-debt.json` the
 * same way `eslint-suppressions.json` freezes jsx-a11y debt: an entry not in
 * the file fails the check, and the file should only shrink.
 */

const SEMANTIC_ROOTS = new Set(['global', 'palette', 'feedback']);

/** Walks a Tokens Studio tree and yields `[path, token]` for every leaf token. */
export function* walkTokens(node, path = []) {
  if (node === null || typeof node !== 'object') {
    return;
  }
  if ('value' in node && typeof node.value !== 'object') {
    yield [path.join('.'), node];
  }
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$') || key === 'value' || key === 'type') {
      continue;
    }
    if (child !== null && typeof child === 'object') {
      yield* walkTokens(child, [...path, key]);
    }
  }
}

/** The group a token belongs to, ignoring the `click.` wrapper. */
export function tokenGroup(tokenPath) {
  const parts = tokenPath.split('.');
  return parts[0] === 'click' ? parts[1] : parts[0];
}

/**
 * Component colour tokens that skip the semantic tier.
 * Returns sorted `"<path> -> <value>"` strings so the baseline diff is readable.
 */
export function findTierLeaks(themeJson) {
  const leaks = [];
  for (const [tokenPath, token] of walkTokens(themeJson)) {
    if (token.type !== 'color' || SEMANTIC_ROOTS.has(tokenGroup(tokenPath))) {
      continue;
    }
    const value = String(token.value);
    const isRaw = !value.includes('{');
    if (isRaw || value.includes('{palette.')) {
      leaks.push(`${tokenPath} -> ${value}`);
    }
  }
  return leaks.sort();
}

/** Token paths present in one theme and missing from the other. */
export function findParityGaps(lightJson, darkJson) {
  const light = new Set([...walkTokens(lightJson)].map(([p]) => p));
  const dark = new Set([...walkTokens(darkJson)].map(([p]) => p));
  return {
    lightOnly: [...light].filter(p => !dark.has(p)).sort(),
    darkOnly: [...dark].filter(p => !light.has(p)).sort(),
  };
}

// Custom properties set at runtime by a dependency rather than declared in CSS.
// Radix writes `--radix-*` onto popper and collapsible content.
export const RUNTIME_PREFIXES = ['--radix-'];

const DECLARATION = /(--[\w-]+)\s*:/g;
const REFERENCE = /var\(\s*(--[\w-]+)/g;
const INLINE_STYLE_KEY = /['"](--[\w-]+)['"]\s*:/g;

const stripComments = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Custom property names declared in CSS text. */
export function declaredProperties(css) {
  return new Set([...stripComments(css).matchAll(DECLARATION)].map(m => m[1]));
}

/** Custom property names set as inline `style` keys in TSX source. */
export function inlineStyleProperties(tsx) {
  return new Set([...tsx.matchAll(INLINE_STYLE_KEY)].map(m => m[1]));
}

/**
 * `var()` references in one stylesheet that nothing declares.
 * Returns `[{ name, line }]`.
 */
export function findUndefinedReferences(css, known) {
  const missing = [];
  stripComments(css)
    .split('\n')
    .forEach((text, index) => {
      for (const match of text.matchAll(REFERENCE)) {
        const name = match[1];
        if (
          !known.has(name) &&
          !RUNTIME_PREFIXES.some(prefix => name.startsWith(prefix))
        ) {
          missing.push({ name, line: index + 1 });
        }
      }
    });
  return missing;
}

/**
 * Compares current debt with the frozen baseline.
 * `added` fails the check; `resolved` means the baseline can be pruned.
 */
export function compareWithBaseline(current, baseline) {
  const result = {};
  for (const key of Object.keys(current)) {
    const now = new Set(current[key]);
    const before = new Set(baseline[key] ?? []);
    result[key] = {
      added: [...now].filter(x => !before.has(x)),
      resolved: [...before].filter(x => !now.has(x)),
    };
  }
  return result;
}
