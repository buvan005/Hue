import { PrismaClient } from '@prisma/client';
import { randomTargetColor } from '../src/utils/color.js';
import { evaluateGuess } from '../src/services/scoringService.js';

const prisma = new PrismaClient();

const SEED_USERS = [
  { username: 'spectral_mind', baseScore: 9.8 },
  { username: 'colour_hawk',   baseScore: 8.8 },
  { username: 'hue_wizard',    baseScore: 8.1 },
  { username: 'chroma_pilot',  baseScore: 7.6 },
  { username: 'prism_walker',  baseScore: 6.9 }
];

async function main() {
  console.log('🌱 Starting database seed for HUE...');

  for (const userDef of SEED_USERS) {
    const normalized = userDef.username.toLowerCase();

    // Create or find user
    let user = await prisma.user.findUnique({
      where: { username_normalized: normalized }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: userDef.username,
          username_normalized: normalized
        }
      });
    }

    // Create 1 completed standard game with 5 rounds
    let gameTotal = 0;
    const targets = Array.from({ length: 5 }, () => randomTargetColor());

    const game = await prisma.game.create({
      data: {
        user_id: user.id,
        status: 'COMPLETED',
        mode: 'standard',
        total_score: 0,
        rounds_completed: 5,
        started_at: new Date(Date.now() - 3600 * 1000),
        completed_at: new Date()
      }
    });

    for (let r = 1; r <= 5; r++) {
      const target = targets[r - 1];
      // Generate a close guess based on baseScore
      const offset = (10 - userDef.baseScore) * 3;
      const guess = {
        h: (target.h + Math.floor(Math.random() * offset - offset / 2) + 360) % 360,
        s: Math.max(0, Math.min(100, target.s + Math.floor(Math.random() * offset - offset / 2))),
        b: Math.max(0, Math.min(100, target.b + Math.floor(Math.random() * offset - offset / 2)))
      };

      const evalResult = evaluateGuess(target, guess);
      gameTotal += evalResult.score;

      await prisma.round.create({
        data: {
          game_id: game.id,
          round_number: r,
          target_h: target.h,
          target_s: target.s,
          target_b: target.b,
          guess_h: guess.h,
          guess_s: guess.s,
          guess_b: guess.b,
          score: evalResult.score,
          color_distance: evalResult.dE
        }
      });
    }

    await prisma.game.update({
      where: { id: game.id },
      data: { total_score: Number(gameTotal.toFixed(2)) }
    });

    console.log(`  ✓ Seeded player ${user.username} with score ${gameTotal.toFixed(2)}`);
  }

  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
