import { hsbToLab, deltaE, hsbHex } from '../utils/color.js';

export function calculateDeltaE(target, guess) {
  const targetLab = hsbToLab(target.h, target.s, target.b);
  const guessLab = hsbToLab(guess.h, guess.s, guess.b);
  return Number(deltaE(targetLab, guessLab).toFixed(2));
}

export function scoreFromDeltaE(diff) {
  if (diff <= 0) return 10;
  if (diff >= 100) return 0;
  const score = 10 * (1 - diff / 100);
  return Number(Math.max(0, score).toFixed(2));
}

export function getScoreMessage(score) {
  if (score >= 9.5) return 'Absolutely perfect. You are the colour.';
  if (score >= 8.5) return 'Nailed it. Your eyes are professionally calibrated.';
  if (score >= 7.0) return 'Very close. Impressive colour memory.';
  if (score >= 5.5) return 'Not bad. The hue was in the neighbourhood.';
  if (score >= 4.0) return 'You remembered the concept of color. That is about it.';
  if (score >= 2.5) return "You didn't play the game. The game played you.";
  if (score >= 1.0) return 'Was the screen even on?';
  return 'A bold choice. Wrong, but bold.';
}

export function evaluateGuess(target, guess) {
  const dE = calculateDeltaE(target, guess);
  const score = scoreFromDeltaE(dE);
  return {
    dE,
    score,
    message: getScoreMessage(score),
    targetHex: hsbHex(target.h, target.s, target.b),
    guessHex: hsbHex(guess.h, guess.s, guess.b)
  };
}
