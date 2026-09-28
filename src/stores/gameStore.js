import { writable } from 'svelte/store';
import {
  createInitialGuess,
  createRoundResult,
  createTargetColor,
  getDailyTargets,
  TOTAL_ROUNDS
} from '../engine/game.js';
import { createUser } from '../api/users.js';
import {
  startGame as apiStartGame,
  submitRound as apiSubmitRound,
  completeGame as apiCompleteGame
} from '../api/games.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const HIGH_SCORE_KEY = 'd_hs';
const USERNAME_KEY   = 'hue_username';
const USER_ID_KEY    = 'hue_user_id';

export const PHASES = {
  START:    'start',
  MEMORIZE: 'memorize',
  GUESS:    'guess',
  RESULT:   'result',
  END:      'end'
};

// ─── Validation & Normalization ───────────────────────────────────────────────

export function normalizeUsername(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().toLowerCase();
}

export function validateUsername(raw) {
  if (typeof raw !== 'string') {
    return { valid: false, error: 'Username must be text.' };
  }
  const trimmed = raw.trim();
  if (trimmed.length < 2) {
    return { valid: false, error: 'Username must be at least 2 characters.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, error: 'Username must not exceed 20 characters.' };
  }
  // Allow letters, numbers, underscores, and hyphens
  const validChars = /^[a-zA-Z0-9_\-]+$/;
  if (!validChars.test(trimmed)) {
    return { valid: false, error: 'Only letters, numbers, underscores, and hyphens allowed.' };
  }
  return {
    valid: true,
    username: trimmed,
    normalized: normalizeUsername(trimmed)
  };
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

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

function readStoredUsername() {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(USERNAME_KEY) || '';
}

function writeStoredUsername(username) {
  if (typeof localStorage === 'undefined') return;
  if (username) localStorage.setItem(USERNAME_KEY, username.trim());
}

function readStoredUserId() {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(USER_ID_KEY) || null;
}

function writeStoredUserId(id) {
  if (typeof localStorage === 'undefined') return;
  if (id) localStorage.setItem(USER_ID_KEY, String(id));
}

// ─── Network helpers ──────────────────────────────────────────────────────────

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL)
  || 'http://localhost:3000';

async function checkBackendOnline() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Initial State Factory ────────────────────────────────────────────────────


function createState() {
  return {
    phase:         PHASES.START,
    username:      readStoredUsername(),
    userId:        readStoredUserId(),
    gameId:        null,
    mode:          'standard', // 'standard' | 'daily'
    round:         0,
    totalRounds:   TOTAL_ROUNDS,
    total:         TOTAL_ROUNDS,  // backward compatibility
    target:        null,
    guessHSB:      createInitialGuess(),
    currentResult: null,
    currentScore:  0,
    totalScore:    0,
    bestScore:     readBestScore(),
    isNewBest:     false,
    rounds:        [],   // array of round results
    history:       [],   // audit trail: { round, result }
    nextTarget:    null, // authoritative next target returned from server
    dailyTargets:  null, // deterministic targets for daily challenge
    isOnline:      false,
    apiError:      null,
    endStats:        null,
    endStatsLoading: false,
    endStatsError:   null
  };
}

// ─── Store Factory ──────────────────────────────────────────────────────────

function createGameStore() {
  const { subscribe, update, set } = writable(createState());

  // ── Internal helpers ──────────────────────────────────────────────────────

  function _patchState(patch) {
    update((s) => ({ ...s, ...patch }));
  }

  /** Try to resolve / create user on backend. Returns userId or null on failure. */
  async function _ensureUser(username) {
    try {
      const data = await createUser(username);
      const id = data?.user?.id ?? data?.id ?? null;
      if (id) {
        writeStoredUserId(id);
        _patchState({ userId: id, isOnline: true, apiError: null });
      }
      return id;
    } catch (err) {
      console.warn('[HUE] Backend unavailable – offline mode.', err.message);
      _patchState({ isOnline: false, apiError: null });
      return null;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  const store = {
    subscribe,

    /** Initialize state and load local storage. */
    init() {
      set(createState());
    },

    /** Set or update username in state and localStorage if valid. */
    setUsername(raw) {
      const res = validateUsername(raw);
      if (res.valid) {
        writeStoredUsername(res.username);
        _patchState({ username: res.username });
        return { success: true, username: res.username };
      }
      return { success: false, error: res.error };
    },

    /**
     * Start a game.  Optimistically begins locally, then wires to server.
     * Requires a valid username (min 2, max 20 chars, alphanumeric/dash/underscore).
     */
    async startGame(userOverride = null, mode = 'standard') {
      let candidate = userOverride;
      if (candidate === null || candidate === undefined) {
        let currentVal = '';
        update((s) => { currentVal = s.username; return s; });
        candidate = currentVal || readStoredUsername();
      }

      const validation = validateUsername(candidate);
      if (!validation.valid) {
        console.warn('[HUE] startGame blocked: invalid username.', validation.error);
        return { success: false, error: validation.error };
      }

      const resolvedUsername = validation.username;
      writeStoredUsername(resolvedUsername);
      let resolvedUserId = null;

      // --- Step 1: Instant local start so UI never freezes ---
      update((state) => {
        // Reuse existing userId only if username didn't change
        if (state.username === resolvedUsername) {
          resolvedUserId = state.userId;
        }

        const nextState = createState();
        nextState.username  = resolvedUsername;
        nextState.userId    = resolvedUserId;
        nextState.bestScore = state.bestScore || readBestScore();
        nextState.mode      = mode;
        nextState.round     = 1;
        nextState.phase     = PHASES.MEMORIZE;

        if (mode === 'daily') {
          nextState.dailyTargets = getDailyTargets();
          nextState.target = nextState.dailyTargets[0];
        } else {
          nextState.target = createTargetColor();
        }

        nextState.guessHSB  = createInitialGuess();
        return nextState;
      });

      // --- Step 2: Try to confirm user on server ---
      if (!resolvedUserId) {
        resolvedUserId = await _ensureUser(resolvedUsername);
      } else {
        const online = await checkBackendOnline();
        _patchState({ isOnline: online });
        if (!online) resolvedUserId = null;
      }

      if (!resolvedUserId) return { success: true, offline: true };

      // --- Step 3: Create server game ---
      try {
        const data = await apiStartGame(resolvedUserId, mode);
        const gameId      = data?.game?.id ?? data?.gameId ?? null;
        const firstTarget = data?.target ?? data?.round?.target ?? null;
        if (gameId) {
          _patchState({
            gameId,
            isOnline: true,
            apiError: null,
            ...(firstTarget ? { target: firstTarget } : {})
          });
        }
        return { success: true, gameId };
      } catch (err) {
        console.warn('[HUE] Could not create server game – running locally.', err.message);
        _patchState({ isOnline: false, gameId: null });
        return { success: true, offline: true };
      }
    },

    /** Return to the Start Screen. */
    goToStart() {
      update((state) => ({ ...state, phase: PHASES.START }));
    },

    /** Transition from memorize → guess phase. */
    finishMemorize() {
      update((state) => {
        if (state.phase !== PHASES.MEMORIZE) return state;
        return { ...state, phase: PHASES.GUESS };
      });
    },

    /**
     * Score the player's guess and transition to result phase.
     * Local score is instant; server score updates async if available.
     * @param {{ h: number, s: number, b: number }} guess
     */
    submitGuess(guess) {
      let capturedRound = 0;
      let capturedGameId = null;
      let capturedOnline = false;

      update((state) => {
        if (state.phase !== PHASES.GUESS || !state.target) return state;
        capturedRound   = state.round;
        capturedGameId  = state.gameId;
        capturedOnline  = state.isOnline;

        const result = createRoundResult(state.target, guess);
        return {
          ...state,
          phase:         PHASES.RESULT,
          guessHSB:      { ...guess },
          currentResult: result,
          currentScore:  result.score,
          rounds:        [...state.rounds, result],
          history:       [...state.history, { round: state.round, result }],
          totalScore:    Number((state.totalScore + result.score).toFixed(2))
        };
      });

      // Fire-and-forget server submission
      if (capturedGameId && capturedOnline) {
        apiSubmitRound(capturedGameId, capturedRound, guess).then((data) => {
          const serverScore = data?.score ?? data?.roundScore ?? null;
          update((s) => {
            const patch = {};
            if (data?.nextTarget) {
              patch.nextTarget = data.nextTarget;
            }
            if (serverScore !== null) {
              const diff = Math.abs((s.currentScore ?? 0) - serverScore);
              if (diff > 0.05) {
                const scoreDelta = serverScore - (s.currentScore ?? 0);
                const newRounds  = [...s.rounds];
                if (newRounds.length > 0) {
                  newRounds[newRounds.length - 1] = {
                    ...newRounds[newRounds.length - 1],
                    score: serverScore
                  };
                }
                patch.currentScore  = serverScore;
                patch.currentResult = { ...s.currentResult, score: serverScore };
                patch.totalScore    = Number((s.totalScore + scoreDelta).toFixed(2));
                patch.rounds        = newRounds;
              }
            }
            return Object.keys(patch).length > 0 ? { ...s, ...patch } : s;
          });
        }).catch((err) => {
          console.warn('[HUE] Round submission failed – keeping local score.', err.message);
          _patchState({ isOnline: false });
        });
      }
    },

    /** Move to the next round, or to END phase if all rounds are done. */
    nextRound() {
      update((state) => {
        if (state.phase !== PHASES.RESULT) return state;

        if (state.round >= state.totalRounds) {
          const isNewBest = writeBestScore(state.totalScore);
          const finishingGameId = state.gameId;

          // Complete game on server (capturing stats)
          if (finishingGameId && state.isOnline) {
            _patchState({ endStatsLoading: true, endStatsError: null });
            apiCompleteGame(finishingGameId).then((data) => {
              update((s) => {
                // Ignore stale response if the player moved to a different game
                if (s.gameId !== finishingGameId) return s;
                return {
                  ...s,
                  endStats: data,
                  endStatsLoading: false,
                  bestScore: data.personalBest ?? s.bestScore,
                  isNewBest: data.isNewBest !== undefined ? data.isNewBest : s.isNewBest
                };
              });
            }).catch((err) => {
              console.warn('[HUE] completeGame failed:', err.message);
              update((s) => {
                if (s.gameId !== finishingGameId) return s;
                return { ...s, endStatsLoading: false, endStatsError: err.message };
              });
            });
          }
          return {
            ...state,
            phase:     PHASES.END,
            bestScore: readBestScore(),
            isNewBest
          };
        }

        let targetForNextRound = state.nextTarget;
        if (!targetForNextRound) {
          if (state.mode === 'daily' && state.dailyTargets) {
            targetForNextRound = state.dailyTargets[state.round] || createTargetColor();
          } else {
            targetForNextRound = createTargetColor();
          }
        }

        return {
          ...state,
          round:         state.round + 1,
          phase:         PHASES.MEMORIZE,
          target:        targetForNextRound,
          nextTarget:    null,
          guessHSB:      createInitialGuess(),
          currentResult: null,
          currentScore:  0
        };
      });
    },

    /** Full reset & retry: start new game with the current username. */
    restart() {
      let savedUsername = '';
      let savedMode = 'standard';
      update((s) => {
        savedUsername = s.username || readStoredUsername();
        savedMode = s.mode || 'standard';
        return s;
      });

      const validation = validateUsername(savedUsername);
      if (!validation.valid) {
        console.warn('[HUE] restart blocked: invalid username.', validation.error);
        store.goToStart();
        return;
      }

      store.startGame(validation.username, savedMode);
    },

    retry() {
      this.restart();
    }
  };

  return store;
}

// ─── Singleton Export ───────────────────────────────────────────────────────

export const gameStore = createGameStore();
