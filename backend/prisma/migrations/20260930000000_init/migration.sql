-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "username_normalized" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rounds_completed" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'standard',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rounds" (
    "id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "round_number" INTEGER NOT NULL,
    "target_h" INTEGER NOT NULL,
    "target_s" INTEGER NOT NULL,
    "target_b" INTEGER NOT NULL,
    "guess_h" INTEGER,
    "guess_s" INTEGER,
    "guess_b" INTEGER,
    "score" DOUBLE PRECISION,
    "color_distance" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rounds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_normalized_key" ON "users"("username_normalized");

-- CreateIndex
CREATE INDEX "games_user_id_idx" ON "games"("user_id");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_total_score_idx" ON "games"("total_score" DESC);

-- CreateIndex
CREATE INDEX "games_created_at_idx" ON "games"("created_at");

-- CreateIndex
CREATE INDEX "games_status_completed_at_idx" ON "games"("status", "completed_at");

-- CreateIndex
CREATE INDEX "games_status_total_score_idx" ON "games"("status", "total_score" DESC);

-- CreateIndex
CREATE INDEX "rounds_game_id_idx" ON "rounds"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "rounds_game_id_round_number_key" ON "rounds"("game_id", "round_number");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rounds" ADD CONSTRAINT "rounds_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
