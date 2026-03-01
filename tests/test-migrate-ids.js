/**
 * Unit tests for migrateSrsCardIds (exported as _migrateSrsCardIds from store.js).
 *
 * Run with: node tests/test-migrate-ids.js
 *
 * Since store.js creates a Store instance at module level (which accesses
 * localStorage), we mock globalThis.localStorage before dynamically importing
 * the module.
 */

import assert from 'node:assert';

// Mock localStorage so Store constructor does not throw on import
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

// Dynamic import after mock is in place
const { _migrateSrsCardIds: migrateSrsCardIds } = await import('../js/store.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}

console.log('migrateSrsCardIds tests\n');

// 1. Empty srsCards
test('empty srsCards returns empty object', () => {
  const result = migrateSrsCardIds({});
  assert.deepStrictEqual(result, {});
});

// 2. Single old-format key
test('single old-format key is remapped', () => {
  const input = { 'v-0101': { interval: 1 } };
  const expected = { 'v-01-001': { interval: 1 } };
  assert.deepStrictEqual(migrateSrsCardIds(input), expected);
});

// 3. Multiple old-format keys across modules
test('multiple old-format keys across modules', () => {
  const input = {
    'v-0105': { interval: 2 },
    'v-0210': { interval: 3 },
    'v-1503': { interval: 4 },
    'v-1620': { interval: 5 }
  };
  const expected = {
    'v-01-005': { interval: 2 },
    'v-02-010': { interval: 3 },
    'v-15-003': { interval: 4 },
    'v-16-020': { interval: 5 }
  };
  assert.deepStrictEqual(migrateSrsCardIds(input), expected);
});

// 4. SRS data preserved
test('SRS data preserved exactly after migration', () => {
  const cardData = {
    interval: 10,
    repetitions: 3,
    easeFactor: 2.5,
    nextReview: '2026-03-05',
    lastReview: '2026-02-23',
    quality: 4
  };
  const input = { 'v-0215': { ...cardData } };
  const result = migrateSrsCardIds(input);
  assert.deepStrictEqual(result['v-02-015'], cardData);
});

// 5. Already-new-format keys pass through unchanged
test('already-new-format keys pass through unchanged', () => {
  const input = { 'v-01-001': { interval: 1 } };
  const expected = { 'v-01-001': { interval: 1 } };
  assert.deepStrictEqual(migrateSrsCardIds(input), expected);
});

// 6. Mixed old and new format
test('mixed old and new format: old remapped, new preserved', () => {
  const input = {
    'v-0101': { interval: 1 },
    'v-01-050': { interval: 2 }
  };
  const expected = {
    'v-01-001': { interval: 1 },
    'v-01-050': { interval: 2 }
  };
  assert.deepStrictEqual(migrateSrsCardIds(input), expected);
});

// 7. Unknown format preserved
test('unknown format keys preserved unchanged', () => {
  const input = { 'custom-key': { interval: 1 } };
  const expected = { 'custom-key': { interval: 1 } };
  assert.deepStrictEqual(migrateSrsCardIds(input), expected);
});

// 8. Key count preserved
test('key count preserved after migration', () => {
  const input = {
    'v-0101': { interval: 1 },
    'v-0202': { interval: 2 },
    'v-01-003': { interval: 3 },
    'custom-key': { interval: 4 }
  };
  const result = migrateSrsCardIds(input);
  assert.strictEqual(Object.keys(result).length, Object.keys(input).length);
});

// 9. Boundary values
test('boundary: v-0199 maps to v-01-099', () => {
  const input = { 'v-0199': { interval: 1 } };
  const expected = { 'v-01-099': { interval: 1 } };
  assert.deepStrictEqual(migrateSrsCardIds(input), expected);
});

test('boundary: v-0150 maps to v-01-050', () => {
  const input = { 'v-0150': { interval: 1 } };
  const expected = { 'v-01-050': { interval: 1 } };
  assert.deepStrictEqual(migrateSrsCardIds(input), expected);
});

// Summary
console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
