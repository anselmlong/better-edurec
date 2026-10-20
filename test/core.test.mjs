import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../src/core.js');
const { ago } = globalThis.EDR;

test('ago describes how fresh a summary is', () => {
  const now = Date.UTC(2026, 9, 21, 12, 0, 0);
  assert.equal(ago(now - 20 * 1000, now), 'just now');
  assert.equal(ago(now - 12 * 60 * 1000, now), '12 min ago');
  assert.equal(ago(now - 60 * 60 * 1000, now), '1 hour ago');
  assert.equal(ago(now - 5 * 3600 * 1000, now), '5 hours ago');
  assert.equal(ago(now - 26 * 3600 * 1000, now), '1 day ago');
  assert.equal(ago(now - 3 * 86400 * 1000, now), '3 days ago');
  assert.match(ago(now - 90 * 86400 * 1000, now), /^on \d/);
});
