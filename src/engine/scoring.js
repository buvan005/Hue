// ─── Score Calculation ──────────────────────────────────────────────────────

/**
 * Convert Delta E distance to a 0–10 score.
 * dE=0 → 10 (perfect), dE≥100 → 0.
 * Linear falloff with divisor 100 — forgiving for same-family colours.
 *
 * Reference points:
 *   ΔE  10 → 9.00  (nearly perfect)
 *   ΔE  20 → 8.00  (very close)
 *   ΔE  33 → 6.70  (same family, different brightness)
 *   ΔE  50 → 5.00  (noticeably different)
 *   ΔE  80 → 2.00  (wrong colour)
 *   ΔE 100 → 0.00  (completely off)
 */
export function scoreFromDeltaE(value) {
  if (value <= 0)   return 10;
  if (value >= 100) return 0;
  const score = 10 * (1 - value / 100);
  return Number(Math.max(0, score).toFixed(2));
}

// ─── Score Messages ─────────────────────────────────────────────────────────

/** Witty feedback based on round score. */
export function scoreMessage(score) {
  if (score >= 9.5) return 'Absolutely perfect. You are the colour.';
  if (score >= 8.5) return 'Nailed it. Your eyes are professionally calibrated.';
  if (score >= 7)   return 'Very close. Impressive colour memory.';
  if (score >= 5.5) return 'Not bad. The hue was in the neighbourhood.';
  if (score >= 4)   return 'You remembered the concept of color. That is about it.';
  if (score >= 2.5) return "You didn't play the game. The game played you.";
  if (score >= 1)   return 'Was the screen even on?';
  return 'A bold choice. Wrong, but bold.';
}

/** End-screen tagline based on average score across all rounds. */
export function endTagline(averageScore) {
  if (averageScore >= 9.5) return "You've ascended. Colour Sage unlocked.";
  if (averageScore >= 8)   return 'Genuinely impressive colour perception.';
  if (averageScore >= 6.5) return 'Solid performance. Your eyes are decent.';
  if (averageScore >= 4.5) return "You tried. That's worth something.";
  if (averageScore >= 2.5) return 'The colours were there. You were not.';
  return "We're all learning here.";
}

/** Fake rank label for social-proof flavour. */
export function rankLabel(score, maxScore) {
  const pct = maxScore === 0 ? 0 : score / maxScore;
  const totalGames = Math.floor(Math.random() * 120000) + 80000;
  const rank = Math.floor(totalGames * (1 - pct * 0.84));
  return `#${rank.toLocaleString()} of ${totalGames.toLocaleString()} games`;
}
