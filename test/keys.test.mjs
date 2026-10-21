import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('../src/keys.js');
const { resolve, BINDINGS } = globalThis.EDR.keys;

test('single keys resolve to their action', () => {
  assert.equal(resolve(['j']).binding.action, 'next');
  assert.equal(resolve(['G']).binding.action, 'last');
  assert.equal(resolve([':']).binding.action, 'command');
  assert.equal(resolve(['3']).binding.arg, 2);
});

test('g waits for a second key, then resolves gg and gi', () => {
  assert.deepEqual(resolve(['g']), { partial: true });
  assert.equal(resolve(['g', 'g']).binding.action, 'first');
  assert.equal(resolve(['g', 'i']).binding.action, 'firstInput');
  assert.deepEqual(resolve(['g', 'z']), { none: true });
});

test('unbound keys resolve to nothing', () => {
  assert.deepEqual(resolve(['x']), { none: true });
});

test('no binding shadows another', () => {
  const seqs = BINDINGS.map((b) => b.seq.join(' '));
  assert.equal(new Set(seqs).size, seqs.length);
  for (const b of BINDINGS) {
    for (const o of BINDINGS) {
      if (b === o || o.seq.length <= b.seq.length) continue;
      assert.ok(!b.seq.every((k, i) => o.seq[i] === k), b.seq.join('') + ' shadows ' + o.seq.join(''));
    }
  }
});
