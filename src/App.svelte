<script>
  import { onMount } from 'svelte';
  import GameCard from './lib/GameCard.svelte';
  import { gameStore } from './stores/gameStore.js';

  let state = {
    phase: 'memorize',
    round: 0,
    total: 5,
    target: null,
    guessHSB: { h: 180, s: 50, b: 50 },
    currentResult: null,
    rounds: [],
    totalScore: 0,
    bestScore: 0,
    isNewBest: false
  };

  const phaseLabels = {
    memorize: 'PHASE 1 / MEMORIZE',
    guess:    'PHASE 2 / GUESS',
    result:   'PHASE 3 / RESULT',
    end:      'PHASE 4 / END'
  };

  const chromeTitles = {
    memorize: 'HUE v1.0 — memorize.view',
    guess:    'HUE v1.0 — guess.view',
    result:   'HUE v1.0 — result.view',
    end:      'HUE v1.0 — end.view'
  };

  onMount(() => {
    const unsubscribe = gameStore.subscribe((value) => {
      state = value;
    });
    gameStore.init();
    return unsubscribe;
  });
</script>

<div class="hue-root">
  <!-- macOS-style window chrome -->
  <div class="window-chrome">
    <div class="dot dot-r"></div>
    <div class="dot dot-y"></div>
    <div class="dot dot-g"></div>
    <span class="chrome-title">{chromeTitles[state.phase] ?? 'HUE v1.0'}</span>
  </div>

  <!-- Main game panel -->
  <div class="game-panel">
    <!-- Topbar -->
    <div class="topbar">
      <span class="topbar-label">HUE</span>
      <span class="topbar-best">Best: {state.bestScore > 0 ? state.bestScore.toFixed(2) : '—'}</span>
    </div>

    <hr class="divider" />
    <div class="phase-tag">{phaseLabels[state.phase] ?? ''}</div>

    <!-- Game content -->
    <GameCard
      phase={state.phase}
      round={state.round}
      total={state.total}
      target={state.target}
      guessHSB={state.guessHSB}
      currentResult={state.currentResult}
      rounds={state.rounds}
      totalScore={state.totalScore}
      isNewBest={state.isNewBest}
      on:memorizeDone={() => gameStore.finishMemorize()}
      on:submit={(e) => gameStore.submitGuess(e.detail)}
      on:next={() => gameStore.nextRound()}
      on:playAgain={() => gameStore.restart()}
    />

    <hr class="divider" />

    <!-- Footer -->
    <div class="footer-bar">
      <span>HUE v1.0 · Color Memory Game</span>
      <span class="footer-icon" aria-label="Sound">♪</span>
    </div>
  </div>
</div>

<style>
  .hue-root {
    font-family: 'JetBrains Mono', monospace;
    background: #F2EFE7;
    color: #1a1a1a;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 16px;
  }

  /* ── Chrome bar ── */
  .window-chrome,
  .game-panel {
    width: 100%;
    max-width: 520px;
  }

  .window-chrome {
    background: #2b2b2b;
    border-radius: 8px 8px 0 0;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .dot-r { background: #FF5F57; }
  .dot-y { background: #FFBD2E; }
  .dot-g { background: #28C840; }

  .chrome-title {
    color: #aaa;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    margin-left: 8px;
    letter-spacing: 0.02em;
  }

  /* ── Game panel ── */
  .game-panel {
    background: #F2EFE7;
    border: 1px solid #c8c3b8;
    border-top: none;
    border-radius: 0 0 8px 8px;
    padding: 20px;
  }

  /* ── Topbar ── */
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .topbar-label {
    font-size: 10px;
    letter-spacing: 0.12em;
    color: #888;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }

  .topbar-best {
    font-size: 11px;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Dashed divider ── */
  .divider {
    border: none;
    border-top: 1px dashed #c8c3b8;
    margin: 14px 0;
  }

  /* ── Phase tag ── */
  .phase-tag {
    font-size: 9px;
    letter-spacing: 0.18em;
    color: #aaa;
    margin-bottom: 12px;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Footer ── */
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: #aaa;
    font-family: 'JetBrains Mono', monospace;
  }

  .footer-icon {
    cursor: pointer;
    transition: color 0.15s;
  }
  .footer-icon:hover {
    color: #555;
  }
</style>
