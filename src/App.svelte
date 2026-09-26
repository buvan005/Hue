<script>
  import { onMount } from 'svelte';
  import GameCard from './lib/GameCard.svelte';
  import { gameStore } from './stores/gameStore.js';

  let state = {
    phase: 'start',
    mode: 'standard',
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

  let soundEnabled = true;
  let urlDisplay = 'localhost:5173';

  const chromeTitles = {
    start:    'HUE v1.0 — start.view',
    memorize: 'HUE v1.0 — memorize.view',
    guess:    'HUE v1.0 — guess.view',
    result:   'HUE v1.0 — result.view',
    end:      'HUE v1.0 — end.view'
  };

  const footerHints = {
    start:    '⏎ press PLAY NOW to begin',
    memorize: '↑ memorize the color',
    guess:    '↑ drag sliders to adjust',
    result:   '→ advance to next round',
    end:      '↺ retry (R) or menu to play again'
  };

  onMount(() => {
    if (typeof window !== 'undefined') {
      urlDisplay = window.location.host || 'localhost:5173';
    }
    const unsubscribe = gameStore.subscribe((v) => { state = v; });
    gameStore.init();
    return unsubscribe;
  });

  $: roundsRemaining = Math.max(0, state.total - state.round);
  $: footerCenter = state.phase === 'start'
    ? '5 rounds · CIELAB ΔE scoring'
    : state.phase === 'end'
    ? 'Game complete'
    : `Round ${state.round} of ${state.total} · ${roundsRemaining} ${roundsRemaining === 1 ? 'round' : 'rounds'} remaining`;
</script>

<div class="hue-root">
  <div class="browser">

    <!-- ── macOS Chrome Bar ── -->
    <div class="chrome">
      <div class="dot dr"></div>
      <div class="dot dy"></div>
      <div class="dot dg"></div>
      <span class="chrome-title">{chromeTitles[state.phase] ?? 'HUE v1.0'}</span>
      <div class="url-bar">{urlDisplay}</div>
    </div>

    <!-- ── Page Content ── -->
    <div class="page">

      <!-- Active Game Top Navigation (only shown during game phases) -->
      {#if state.phase !== 'start'}
        <div class="topnav">
          <button
            class="nav-brand-btn"
            on:click={() => gameStore.goToStart()}
            title="Return to Start Screen"
          >
            <span class="nav-brand">HUE</span>
            <span class="nav-back-tag">← MENU</span>
          </button>

          <div class="nav-right">
            <span class="nav-round-indicator">
              {state.mode === 'daily' ? 'DAILY · ' : ''}R{state.round} / {state.total}
            </span>
            <span class="nav-best">
              Best: {state.bestScore > 0 ? state.bestScore.toFixed(2) : '—'}
            </span>
            <button
              class="nav-sound-btn {soundEnabled ? 'sound-on' : 'sound-off'}"
              on:click={() => (soundEnabled = !soundEnabled)}
              title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
              aria-label="Toggle sound"
            >
              <svg class="nav-sound" viewBox="0 0 18 18" fill="none">
                <path d="M3 6.5H6L10 3v12l-4-3.5H3V6.5z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
                {#if soundEnabled}
                  <path d="M13 5.5c1.2 1 2 2.5 2 3.5s-.8 2.5-2 3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                {:else}
                  <line x1="13" y1="6" x2="16" y2="12" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
                {/if}
              </svg>
            </button>
          </div>
        </div>
      {/if}

      <!-- Main Game Card / View -->
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
        on:play={() => gameStore.startGame()}
        on:daily={() => gameStore.startGame('daily')}
        on:memorizeDone={() => gameStore.finishMemorize()}
        on:submit={(e) => gameStore.submitGuess(e.detail)}
        on:next={() => gameStore.nextRound()}
        on:retry={() => gameStore.restart()}
        on:playAgain={() => gameStore.restart()}
        on:home={() => gameStore.goToStart()}
      />

      <!-- Global Footer Bar -->
      <div class="footer-bar">
        <span class="footer-txt">HUE v1.0 · Color Memory Game</span>
        <span class="footer-txt footer-txt-mid">{footerCenter}</span>
        <span class="footer-txt footer-txt-hint">{footerHints[state.phase] ?? ''}</span>
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
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.10);
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
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .url-bar {
    background: #1e1e1e;
    border-radius: 4px;
    padding: 3px 12px;
    font-size: 10px;
    color: #666;
    font-family: 'JetBrains Mono', monospace;
    min-width: 140px;
    text-align: center;
    letter-spacing: 0.04em;
  }

  /* ── Page ── */
  .page {
    background: #EDEAE0;
    display: flex;
    flex-direction: column;
  }

  /* ── Top nav ── */
  .topnav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 20px;
    border-bottom: 1px dashed #C8C3B4;
    background: #EAE6DC;
  }

  .nav-brand-btn {
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 2px 4px;
    border-radius: 3px;
    transition: opacity 0.15s ease;
  }

  .nav-brand-btn:hover {
    opacity: 0.75;
  }

  .nav-brand {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 0.05em;
    font-family: 'JetBrains Mono', monospace;
  }

  .nav-back-tag {
    font-size: 9px;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.08em;
    background: #DFDACD;
    padding: 2px 6px;
    border-radius: 2px;
  }

  .nav-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .nav-round-indicator {
    font-size: 10px;
    font-weight: 700;
    color: #1a1a1a;
    letter-spacing: 0.06em;
    background: #E0DBD0;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid #C8C3B4;
  }

  .nav-best {
    font-size: 10px;
    color: #888;
    letter-spacing: 0.08em;
    font-family: 'JetBrains Mono', monospace;
  }

  .nav-sound-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a1a1a;
    opacity: 0.45;
    transition: opacity 0.15s ease;
  }

  .nav-sound-btn:hover {
    opacity: 0.85;
  }

  .nav-sound {
    width: 17px;
    height: 17px;
  }

  /* ── Footer ── */
  .footer-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 9px 20px;
    border-top: 1px dashed #C8C3B4;
    background: #E8E4DA;
  }

  .footer-txt {
    font-size: 9px;
    color: #999;
    letter-spacing: 0.06em;
    font-family: 'JetBrains Mono', monospace;
  }

  @media (max-width: 600px) {
    .footer-txt-mid {
      display: none;
    }
    .url-bar {
      display: none;
    }
  }
</style>
