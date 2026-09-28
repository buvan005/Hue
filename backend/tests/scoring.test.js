import test from 'node:test';
import assert from 'node:assert';
import { calculateDeltaE, scoreFromDeltaE, getScoreMessage, evaluateGuess } from '../src/services/scoringService.js';
import { normalizeUsername, validateUsername } from '../src/services/userService.js';
import { getDailyTargets } from '../src/utils/color.js';

test('Scoring Service — deltaE and linear score calculation', () => {
  const target = { h: 180, s: 50, b: 50 };
  const identicalGuess = { h: 180, s: 50, b: 50 };

  const dE = calculateDeltaE(target, identicalGuess);
  assert.strictEqual(dE, 0, 'Delta E of identical color must be 0');

  const perfectScore = scoreFromDeltaE(0);
  assert.strictEqual(perfectScore, 10, 'Score for 0 Delta E must be 10.0');

  const zeroScore = scoreFromDeltaE(100);
  assert.strictEqual(zeroScore, 0, 'Score for >= 100 Delta E must be 0.0');

  const midScore = scoreFromDeltaE(20);
  assert.strictEqual(midScore, 8.0, 'Score for 20 Delta E must be 8.0');
});

test('Scoring Service — evaluateGuess returns message and hex', () => {
  const target = { h: 0, s: 100, b: 100 }; // Red
  const guess = { h: 0, s: 100, b: 100 };

  const evalResult = evaluateGuess(target, guess);
  assert.strictEqual(evalResult.score, 10);
  assert.strictEqual(evalResult.dE, 0);
  assert.strictEqual(evalResult.targetHex, '#ff0000');
  assert.strictEqual(evalResult.guessHex, '#ff0000');
  assert.ok(evalResult.message.length > 0);
});

test('User Service — username normalization & validation', () => {
  assert.strictEqual(normalizeUsername('  Buvan_005  '), 'buvan_005');
  assert.strictEqual(normalizeUsername('ALICE'), 'alice');

  assert.strictEqual(validateUsername('').valid, false);
  assert.strictEqual(validateUsername('x').valid, false);
  assert.strictEqual(validateUsername('toolong_username_123456789012345').valid, false);
  assert.strictEqual(validateUsername('user!@#').valid, false);

  const valid = validateUsername('  Gamer-99_pro  ');
  assert.strictEqual(valid.valid, true);
  assert.strictEqual(valid.username, 'Gamer-99_pro');
  assert.strictEqual(valid.normalized, 'gamer-99_pro');
});

test('Daily Challenge — deterministic seed generation', () => {
  const targets1 = getDailyTargets('2026-09-26');
  const targets2 = getDailyTargets('2026-09-26');
  assert.deepStrictEqual(targets1, targets2, 'Same date must generate identical 5 targets');
  assert.strictEqual(targets1.length, 5);

  const targetsDiffDate = getDailyTargets('2026-09-27');
  assert.notDeepStrictEqual(targets1, targetsDiffDate, 'Different dates must yield different targets');
});
