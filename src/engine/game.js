import {
  deltaE,
  hsbHex,
  hsbToLab,
  hsbToRgb,
  luma,
  randomGuessColor,
  randomTargetColor
} from './color.js';
import { scoreFromDeltaE, scoreMessage } from './scoring.js';

/** Number of rounds per game. */
export const TOTAL_ROUNDS = 5;

/** Generate a new random target color for the current round. */
export function createTargetColor() {
  return randomTargetColor();
}

/** Generate a random initial guess (offset from neutral). */
export function createInitialGuess() {
  return randomGuessColor();
}

/**
 * Compute the result for a single round.
 *
 * @param {{ h: number, s: number, b: number }} target
 * @param {{ h: number, s: number, b: number }} guess
 * @returns {{
 *   score: number,
 *   dE: number,
 *   guess: { h, s, b, hex: string, luma: number },
 *   target: { h, s, b, hex: string, luma: number },
 *   msg: string
 * }}
 */
export function createRoundResult(target, guess) {
  const targetLab = hsbToLab(target.h, target.s, target.b);
  const guessLab  = hsbToLab(guess.h, guess.s, guess.b);
  const diff      = deltaE(targetLab, guessLab);
  const score     = scoreFromDeltaE(diff);
  const targetRgb = hsbToRgb(target.h, target.s, target.b);
  const guessRgb  = hsbToRgb(guess.h, guess.s, guess.b);

  return {
    score,
    dE: Number(diff.toFixed(2)),
    guess: {
      ...guess,
      hex:  hsbHex(guess.h, guess.s, guess.b),
      luma: luma(guessRgb.r, guessRgb.g, guessRgb.b)
    },
    target: {
      ...target,
      hex:  hsbHex(target.h, target.s, target.b),
      luma: luma(targetRgb.r, targetRgb.g, targetRgb.b)
    },
    msg: scoreMessage(score)
  };
}
