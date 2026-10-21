import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../src/themes.js');
const { THEMES, TOKENS, css } = globalThis.EDR.themes;

function luminance(hex) {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Text the student reads, on the surface it sits on. 4.5:1 is WCAG AA for body text.
const PAIRS = [
  ['ink', 'surface'], ['ink', 'bg'], ['ink-2', 'surface'], ['muted', 'surface'], ['muted', 'bg'],
  ['on-primary', 'navy'], ['selected-ink', 'tint'], ['blue', 'surface'], ['warn', 'warn-bg'],
  ['brand-ink', 'brand-bg'], ['inverse-ink', 'inverse-bg'], ['ink', 'surface-3']
];

test('every theme defines every token', () => {
  for (const t of THEMES) {
    const missing = TOKENS.filter((k) => !t.tokens[k]);
    assert.deepEqual(missing, [], t.id + ' is missing tokens');
  }
});

test('theme ids are unique', () => {
  assert.equal(new Set(THEMES.map((t) => t.id)).size, THEMES.length);
});

test('readable text meets WCAG AA in every theme', () => {
  const failures = [];
  for (const t of THEMES) {
    for (const [fg, bg] of PAIRS) {
      const ratio = contrast(t.tokens[fg], t.tokens[bg]);
      if (ratio < 4.5) failures.push(t.id + ': ' + fg + ' on ' + bg + ' = ' + ratio.toFixed(2));
    }
  }
  assert.deepEqual(failures, []);
});

test('generated stylesheet has one rule per theme', () => {
  const rules = css().split('\n');
  assert.equal(rules.length, THEMES.length);
  assert.match(rules[0], /^html\[data-edr-on\]\[data-edr-theme="campus"\] \{ --edr-bg: #F4F6F9;/);
});
