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

  const chromeTitles = {
    memorize: 'HUE v1.0 — memorize.view',
    guess:    'HUE v1.0 — guess.view',
    result:   'HUE v1.0 — result.view',
    end:      'HUE v1.0 — end.view'
  };

  const footerHints = {
    memorize: '↑ memorize the color',
    guess:    '↑ drag sliders to adjust',
    result:   '→ advance to next round',
    end:      '↺ play again to improve'
  };

  onMount(() => {
    const unsubscribe = gameStore.subscribe((v) => { state = v; });
    gameStore.init();
    return unsubscribe;
  });

  $: roundsRemaining = Math.max(0, state.total - state.round);
  $: footerCenter = state.phase === 'end'
    ? 'Game complete'
    : `Round ${state.round} of ${state.total} · ${roundsRemaining} ${roundsRemaining === 1 ? 'round' : 'rounds'} remaining`;
</script>

<div class="hue-root">
  <div class="browser">

    <!-- ── macOS chrome ── -->
    <div class="chrome">
      <div class="dot dr"></div>
      <div class="dot dy"></div>
      <div class="dot dg"></div>
      <span class="chrome-title">{chromeTitles[state.phase] ?? 'HUE v1.0'}</span>
      <div class="url-bar">localhost:5173</div>
    </div>

    <!-- ── Page ── -->
    <div class="page">

      <!-- Top nav -->
      <div class="topnav">
        <span class="nav-brand">HUE</span>
        <div class="nav-right">
          <span class="nav-best">Best: {state.bestScore > 0 ? state.bestScore.toFixed(2) : '—'}</span>
          <svg class="nav-sound" viewBox="0 0 18 18" fill="none" aria-label="Sound" role="img">
            <path d="M3 6.5H6L10 3v12l-4-3.5H3V6.5z" stroke="#1a1a1a" stroke-width="1.2" stroke-linejoin="round"/>
            <path d="M13 5.5c1.2 1 2 2.5 2 3.5s-.8 2.5-2 3.5" stroke="#1a1a1a" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </div>
      </div>

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
        bestScore={state.bestScore}
        isNewBest={state.isNewBest}
        on:memorizeDone={() => gameStore.finishMemorize()}
        on:submit={(e) => gameStore.submitGuess(e.detail)}
        on:next={() => gameStore.nextRound()}
        on:playAgain={() => gameStore.restart()}
      />

      <!-- Footer -->
      <div class="footer-bar">
        <span class="footer-txt">HUE v1.0 · Color Memory Game</span>
        <span class="footer-txt">{footerCenter}</span>
        <span class="footer-txt">{footerHints[state.phase] ?? ''}</span>
      </div>

    </div>
  </div>
</div>

<style>
  .hue-root {
    font-family: 'JetBrains Mono', monospace;
    background: #EDEAE0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }

  /* ── Browser shell ── */
  .browser {
    width: 100%;
    max-width: 860px;
    background: #2b2b2b;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid #1a1a1a;
    box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10);
  }

  /* ── Chrome bar ── */
  .chrome {
    background: #323232;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-bottom: 1px solid #1a1a1a;
  }

  .dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; }
  .dr  { background: #FF5F57; }
  .dy  { background: #FFBD2E; }
  .dg  { background: #28C840; }

  .chrome-title {
    color: #888;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    margin-left: 8px;
    flex: 1;
  }

  .url-bar {
    background: #1e1e1e;
    border-radius: 4px;
    padding: 3px 12px;
    font-size: 10px;
    color: #555;
    font-family: 'JetBrains Mono', monospace;
    min-width: 160px;
    text-align: center;
    letter-spacing: 0.04em;
  }

  /* ── Page ── */
  .page {
    background: #EDEAE0;
  }

  /* ── Top nav ── */
  .topnav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    border-bottom: 1px dashed #C8C3B4;
  }

  .nav-brand {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 0.05em;
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .nav-best {
    font-size: 10px;
    color: #999;
    letter-spacing: 0.1em;
    font-family: 'JetBrains Mono', monospace;
  }

  .nav-sound {
    width: 18px;
    height: 18px;
    cursor: pointer;
    opacity: 0.35;
    transition: opacity 0.15s;
  }
  .nav-sound:hover { opacity: 0.65; }

  /* ── Footer ── */
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    border-top: 1px dashed #C8C3B4;
  }

  .footer-txt {
    font-size: 9px;
    color: #AAA;
    letter-spacing: 0.08em;
    font-family: 'JetBrains Mono', monospace;
  }
</style>
