import { writable } from 'svelte/store';
import {
  createInitialGuess,
  createRoundResult,
  createTargetColor,
  TOTAL_ROUNDS
} from '../engine/game.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const HIGH_SCORE_KEY = 'd_hs';

export const PHASES = {
  START:    'start',
  MEMORIZE: 'memorize',
  GUESS:    'guess',
  RESULT:   'result',
  END:      'end'
};

// ─── LocalStorage helpers ───────────────────────────────────────────────────

function readBestScore() {
  if (typeof localStorage === 'undefined') return 0;
  return Number.parseFloat(localStorage.getItem(HIGH_SCORE_KEY) || '0');
}

function writeBestScore(score) {
  if (typeof localStorage === 'undefined') return false;

  const currentBest = readBestScore();
  const rounded = Number(score.toFixed(2));

  if (rounded > currentBest) {
    localStorage.setItem(HIGH_SCORE_KEY, String(rounded));
    return true;
  }
  return false;
}

// ─── Initial State Factory ──────────────────────────────────────────────────

function createState() {
  return {
    phase:         PHASES.START,
    mode:          'standard', // 'standard' | 'daily'
    round:         0,
    total:         TOTAL_ROUNDS,
    target:        null,
    guessHSB:      createInitialGuess(),
    currentResult: null,
    rounds:        [],      // array of round results (for end-screen breakdown)
    totalScore:    0,
    bestScore:     0,
    isNewBest:     false,
    history:       []       // full audit trail: { round, result }
  };
}

// ─── Store Factory ──────────────────────────────────────────────────────────

function createGameStore() {
  const { subscribe, update, set } = writable(createState());

  /** Advance to the next round: generate new target + initial guess. */
  function startRound() {
    update((state) => ({
      ...state,
      round:         state.round + 1,
      phase:         PHASES.MEMORIZE,
      target:        createTargetColor(),
      guessHSB:      createInitialGuess(),
      currentResult: null
    }));
  }

  return {
    subscribe,

    /** Initialize state to Start screen and load best score. */
    init() {
      const state = createState();
      state.bestScore = readBestScore();
      state.phase = PHASES.START;
      set(state);
    },

    /** Start the game from the beginning (Round 1). */
    startGame(mode = 'standard') {
      const state = createState();
      state.bestScore = readBestScore();
      state.mode = mode;
      state.round = 1;
      state.phase = PHASES.MEMORIZE;
      state.target = createTargetColor();
      state.guessHSB = createInitialGuess();
      set(state);
    },

    /** Return to the Start Screen. */
    goToStart() {
      update((state) => ({
        ...state,
        phase: PHASES.START
      }));
    },

    /** Transition from memorize → guess phase. */
    finishMemorize() {
      update((state) => ({ ...state, phase: PHASES.GUESS }));
    },

    /**
     * Score the player's guess and transition to result phase.
     * @param {{ h: number, s: number, b: number }} guess
     */
    submitGuess(guess) {
      update((state) => {
        if (!state.target) return state;

        const result = createRoundResult(state.target, guess);

        return {
          ...state,
          phase:         PHASES.RESULT,
          guessHSB:      { ...guess },
          currentResult: result,
          rounds:        [...state.rounds, result],
          history:       [...state.history, { round: state.round, result }],
          totalScore:    state.totalScore + result.score
        };
      });
    },

    /** Move to the next round, or to end phase if all rounds are done. */
    nextRound() {
      update((state) => {
        if (state.round >= state.total) {
          const isNewBest = writeBestScore(state.totalScore);
          return {
            ...state,
            phase:     PHASES.END,
            bestScore: readBestScore(),
            isNewBest
          };
        }

        return {
          ...state,
          round:         state.round + 1,
          phase:         PHASES.MEMORIZE,
          target:        createTargetColor(),
          guessHSB:      createInitialGuess(),
          currentResult: null
        };
      });
    },

    /** Full reset & retry: start new game from scratch. */
    restart() {
      this.startGame();
    },

    retry() {
      this.startGame();
    }
  };
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const gameStore = createGameStore();
