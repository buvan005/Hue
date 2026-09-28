import assert from 'node:assert';
import { validateUsername, normalizeUsername } from '../src/stores/gameStore.js';
import { scoreFromDeltaE } from '../src/engine/scoring.js';
import { hsbToRgb, rgbToXyz, xyzToLab, hsbToLab, deltaE } from '../src/engine/color.js';

console.log('Running HUE core logic tests...');

// 1. Username validation tests
assert.strictEqual(validateUsername('').valid, false, 'Empty username should fail');
assert.strictEqual(validateUsername('a').valid, false, '1-char username should fail');
assert.strictEqual(validateUsername('this_username_is_way_too_long_for_game').valid, false, 'Over 20 chars should fail');
assert.strictEqual(validateUsername('user@name!').valid, false, 'Special chars should fail');

const validUser = validateUsername('  Buvan_005  ');
assert.strictEqual(validUser.valid, true, 'Valid username should pass');
assert.strictEqual(validUser.username, 'Buvan_005', 'Username should be trimmed');
assert.strictEqual(validUser.normalized, 'buvan_005', 'Normalized username should be lowercase');

// 2. Color conversion tests
const rgb = hsbToRgb(0, 100, 100); // Pure Red
assert.strictEqual(rgb.r, 255);
assert.strictEqual(rgb.g, 0);
assert.strictEqual(rgb.b, 0);

const labRed = hsbToLab(0, 100, 100);
const labRed2 = hsbToLab(0, 100, 100);
const dESame = deltaE(labRed, labRed2);
assert.strictEqual(dESame, 0, 'Same color deltaE must be 0');

// 3. Scoring formula tests
assert.strictEqual(scoreFromDeltaE(0), 10, 'ΔE 0 must yield 10 score');
assert.strictEqual(scoreFromDeltaE(100), 0, 'ΔE >= 100 must yield 0 score');
assert.strictEqual(scoreFromDeltaE(20), 8.0, 'ΔE 20 should yield 8.0 score');

// 4. Daily Challenge deterministic seed tests
import { getDailyTargets, createDailyTarget } from '../src/engine/game.js';

const dailyA = getDailyTargets('2026-09-28');
const dailyB = getDailyTargets('2026-09-28');
const dailyC = getDailyTargets('2026-09-29');

assert.strictEqual(dailyA.length, 5, 'Daily challenge must have exactly 5 targets');
assert.deepStrictEqual(dailyA, dailyB, 'Same date must generate identical daily targets');
assert.notDeepStrictEqual(dailyA, dailyC, 'Different dates should produce different targets');

for (const t of dailyA) {
  assert(t.h >= 0 && t.h <= 360, `Hue ${t.h} must be within bounds`);
  assert(t.s >= 28 && t.s <= 100, `Sat ${t.s} must be within bounds`);
  assert(t.b >= 32 && t.b <= 95, `Bri ${t.b} must be within bounds`);
}

const firstTarget = createDailyTarget(0, '2026-09-28');
assert.deepStrictEqual(firstTarget, dailyA[0], 'createDailyTarget(0) must match target 0');

console.log('✓ All core logic tests passed successfully!');
