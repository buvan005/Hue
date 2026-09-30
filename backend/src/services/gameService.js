import prisma from '../utils/prisma.js';
import { randomTargetColor, getDailyTargets } from '../utils/color.js';
import { evaluateGuess } from './scoringService.js';
import { getPlayerRankAndPercentile } from './leaderboardService.js';

const TOTAL_ROUNDS = 5;
const GAME_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function createGame(userId, mode = 'standard') {
  // Validate user
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  // Generate 5 targets (server-authoritative)
  let targets;
  if (mode === 'daily') {
    const today = new Date().toISOString().split('T')[0];
    targets = getDailyTargets(today);
  } else {
    targets = Array.from({ length: TOTAL_ROUNDS }, () => randomTargetColor());
  }

  // Create game and rounds in transaction
  const game = await prisma.$transaction(async (tx) => {
    const newGame = await tx.game.create({
      data: {
        user_id: userId,
        status: 'IN_PROGRESS',
        mode,
        total_score: 0.0,
        rounds_completed: 0
      }
    });

    // Create 5 target rows
    const roundData = targets.map((t, idx) => ({
      game_id: newGame.id,
      round_number: idx + 1,
      target_h: t.h,
      target_s: t.s,
      target_b: t.b
    }));

    await tx.round.createMany({
      data: roundData
    });

    return newGame;
  });

  // Return ONLY Round 1 target to client (hiding rounds 2-5)
  return {
    gameId: game.id,
    roundNumber: 1,
    totalRounds: TOTAL_ROUNDS,
    mode: game.mode,
    target: {
      h: targets[0].h,
      s: targets[0].s,
      b: targets[0].b
    }
  };
}

export async function submitRound(gameId, roundNumber, guess, userId = null) {
  // Validate guess values
  if (
    typeof guess?.h !== 'number' || guess.h < 0 || guess.h > 360 ||
    typeof guess?.s !== 'number' || guess.s < 0 || guess.s > 100 ||
    typeof guess?.b !== 'number' || guess.b < 0 || guess.b > 100
  ) {
    const err = new Error('Invalid HSB guess coordinates.');
    err.statusCode = 400;
    throw err;
  }

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { rounds: { orderBy: { round_number: 'asc' } } }
  });

  if (!game) {
    const err = new Error('Game not found.');
    err.statusCode = 404;
    throw err;
  }

  // Verify ownership if requested
  if (userId && game.user_id !== userId) {
    const err = new Error('Unauthorized: game does not belong to this user.');
    err.statusCode = 403;
    throw err;
  }

  if (game.status === 'COMPLETED') {
    const err = new Error('Game is already completed.');
    err.statusCode = 400;
    throw err;
  }

  if (game.status === 'ABANDONED') {
    const err = new Error('Game has expired or been abandoned.');
    err.statusCode = 400;
    throw err;
  }

  // Check expiration (2 hours)
  const elapsed = Date.now() - new Date(game.started_at).getTime();
  if (elapsed > GAME_TIMEOUT_MS) {
    await prisma.game.update({
      where: { id: gameId },
      data: { status: 'ABANDONED' }
    });
    const err = new Error('Game session has expired.');
    err.statusCode = 400;
    throw err;
  }

  // Validate round sequence (prevent skipping or resubmitting)
  const expectedRound = game.rounds_completed + 1;
  if (roundNumber !== expectedRound) {
    const err = new Error(`Invalid round sequence. Expected round ${expectedRound}, got ${roundNumber}.`);
    err.statusCode = 400;
    throw err;
  }

  // Target for current round
  const currentRoundRow = game.rounds.find((r) => r.round_number === roundNumber);
  if (!currentRoundRow) {
    const err = new Error(`Target for round ${roundNumber} not found.`);
    err.statusCode = 500;
    throw err;
  }

  // Prevent duplicate submission for this round
  if (currentRoundRow.score !== null) {
    const err = new Error(`Round ${roundNumber} has already been submitted.`);
    err.statusCode = 400;
    throw err;
  }

  const target = {
    h: currentRoundRow.target_h,
    s: currentRoundRow.target_s,
    b: currentRoundRow.target_b
  };

  // Authoritative scoring
  const evaluation = evaluateGuess(target, guess);

  // Update in transaction
  const updated = await prisma.$transaction(async (tx) => {
    await tx.round.update({
      where: { id: currentRoundRow.id },
      data: {
        guess_h: Math.round(guess.h),
        guess_s: Math.round(guess.s),
        guess_b: Math.round(guess.b),
        score: evaluation.score,
        color_distance: evaluation.dE
      }
    });

    const newCompletedCount = game.rounds_completed + 1;
    const newTotalScore = Number((game.total_score + evaluation.score).toFixed(2));
    const isFinished = newCompletedCount >= TOTAL_ROUNDS;

    const updatedGame = await tx.game.update({
      where: { id: gameId },
      data: {
        rounds_completed: newCompletedCount,
        total_score: newTotalScore,
        status: 'IN_PROGRESS'
      }
    });

    return { updatedGame, isFinished, newCompletedCount, newTotalScore };
  });

  // Next target if not finished
  let nextTarget = null;
  if (!updated.isFinished) {
    const nextRoundRow = game.rounds.find((r) => r.round_number === roundNumber + 1);
    if (nextRoundRow) {
      nextTarget = {
        h: nextRoundRow.target_h,
        s: nextRoundRow.target_s,
        b: nextRoundRow.target_b
      };
    }
  }

  return {
    roundNumber,
    score: evaluation.score,
    dE: evaluation.dE,
    message: evaluation.message,
    target: {
      ...target,
      hex: evaluation.targetHex
    },
    guess: {
      h: Math.round(guess.h),
      s: Math.round(guess.s),
      b: Math.round(guess.b),
      hex: evaluation.guessHex
    },
    totalScore: updated.newTotalScore,
    roundsCompleted: updated.newCompletedCount,
    isComplete: updated.isFinished,
    nextRound: updated.isFinished ? null : roundNumber + 1,
    nextTarget
  };
}

export async function completeGame(gameId, userId = null) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      rounds: { orderBy: { round_number: 'asc' } },
      user: true
    }
  });

  if (!game) {
    const err = new Error('Game not found.');
    err.statusCode = 404;
    throw err;
  }

  // Verify ownership if requested
  if (userId && game.user_id !== userId) {
    const err = new Error('Unauthorized: game does not belong to this user.');
    err.statusCode = 403;
    throw err;
  }

  // Prevent re-completing already completed games
  if (game.status === 'COMPLETED') {
    const err = new Error('Game is already completed.');
    err.statusCode = 400;
    throw err;
  }

  // Check for missing rounds (all 5 rounds required)
  const validRounds = game.rounds.filter((r) => r.score !== null);
  if (validRounds.length < TOTAL_ROUNDS) {
    const err = new Error(`Cannot complete game: missing rounds (${validRounds.length}/${TOTAL_ROUNDS} completed).`);
    err.statusCode = 400;
    throw err;
  }

  // Calculate authoritative total from completed rounds
  const totalScore = Number(validRounds.reduce((acc, r) => acc + (r.score || 0), 0).toFixed(2));

  // Atomic completion in transaction
  await prisma.$transaction(async (tx) => {
    const latest = await tx.game.findUnique({ where: { id: gameId } });
    if (latest.status === 'COMPLETED') {
      const err = new Error('Game is already completed.');
      err.statusCode = 400;
      throw err;
    }
    await tx.game.update({
      where: { id: gameId },
      data: {
        status: 'COMPLETED',
        completed_at: game.completed_at || new Date(),
        total_score: totalScore,
        rounds_completed: validRounds.length
      }
    });
  });
  const finalStatus = 'COMPLETED';

  // Find user's best score across previous completed games
  const previousBestGame = await prisma.game.findFirst({
    where: {
      user_id: game.user_id,
      status: 'COMPLETED',
      id: { not: gameId }
    },
    orderBy: { total_score: 'desc' }
  });

  const previousBest = previousBestGame ? previousBestGame.total_score : 0;
  const isNewBest = previousBestGame ? (totalScore > previousBest) : true;

  // Authoritative ranking and percentile from shared Leaderboard Service
  const ranking = await getPlayerRankAndPercentile(game.user_id, 'all');

  return {
    gameId: game.id,
    userId: game.user_id,
    username: game.user.username,
    status: finalStatus,
    totalScore,
    personalBest: ranking.bestScore ?? Math.max(previousBest, totalScore),
    isNewBest,
    globalRank: ranking.globalRank,
    rank: ranking.rank,
    percentile: ranking.percentile,
    percentageLower: ranking.percentageLower,
    averagePlayerScore: ranking.averagePlayerScore,
    totalPlayers: ranking.totalPlayers,
    rounds: validRounds.map((r) => ({
      round: r.round_number,
      score: r.score,
      dE: r.color_distance,
      target: { h: r.target_h, s: r.target_s, b: r.target_b },
      guess: { h: r.guess_h, s: r.guess_s, b: r.guess_b }
    }))
  };
}
