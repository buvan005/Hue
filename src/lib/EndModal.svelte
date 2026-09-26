<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ScoreDisplay from './ScoreDisplay.svelte';
  import { endTagline, rankLabel } from '../engine/scoring.js';

  export let rounds      = [];
  export let totalScore  = 0;
  export let total       = 5;
  export let isNewBest   = false;

  const dispatch = createEventDispatcher();

  let stripVisible = false;
  let rank = '';
  let copied = false;

  onMount(() => {
    rank = rankLabel(totalScore, total * 10);
    const t = setTimeout(() => { stripVisible = true; }, 600);

    function handleKeydown(e) {
      if (e.key === 'r' || e.key === 'R' || e.key === 'Enter') {
        if (document.activeElement?.tagName === 'BUTTON') return;
        e.preventDefault();
        dispatch('retry');
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  function handleShare() {
    const text = `I scored ${totalScore.toFixed(2)}/${total * 10} on HUE (Color Memory Game). Can you beat my perceptual vision?`;
    if (navigator.share) {
      navigator.share({ title: 'HUE', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      copied = true;
      setTimeout(() => { copied = false; }, 2000);
    }
  }
</script>

<div class="end-screen">
  <div class="end-panel">

    <!-- Top bar -->
    <div class="end-topbar">
      <span class="end-rank">{rank}</span>
      {#if isNewBest}
        <span in:fade={{ duration: 400 }} class="end-best">★ NEW BEST SCORE</span>
      {/if}
    </div>

    <!-- Score -->
    <div class="end-score-row">
      <ScoreDisplay
        value={totalScore}
        decimals={2}
        duration={1200}
        delay={100}
        color="#fff"
        size="clamp(52px, 14vw, 76px)"
      />
      <span class="end-denom">/{total * 10}</span>
    </div>

    <!-- Tagline -->
    <p class="end-tagline">{endTagline(totalScore / total)}</p>

    <!-- Round chips -->
    {#if stripVisible}
      <div
        class="chips-row"
        in:fly={{ y: 10, duration: 350, easing: cubicOut }}
      >
        {#each rounds as r, i}
          <div
            class="chip"
            in:fly={{ y: 8, duration: 300, delay: i * 60, easing: cubicOut }}
          >
            <div class="chip-half" style="background-color: {r.guess.hex};" title="Guess: {r.guess.hex}"></div>
            <div class="chip-half" style="background-color: {r.target.hex};" title="Target: {r.target.hex}"></div>
            <span class="chip-score">{r.score.toFixed(1)}</span>
            <span class="chip-rnd">R{i + 1}</span>
          </div>
        {/each}
      </div>
    {:else}
      <div class="chips-row">
        {#each Array(total) as _}
          <div class="chip chip-skeleton"></div>
        {/each}
      </div>
    {/if}

    <!-- Actions -->
    <div class="end-actions">
      <div class="end-btn-row">
        <button
          class="btn-primary btn-retry"
          on:click={() => { dispatch('retry'); dispatch('playAgain'); }}
          title="Retry game (Press R or Enter)"
        >
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" width="14" height="14">
            <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9L1.5 6.5M1.5 2v4.5H6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>RETRY GAME</span>
          <span class="btn-badge">R</span>
        </button>

        <button
          class="btn-secondary"
          on:click={() => dispatch('home')}
          title="Back to Start Screen"
        >
          <svg class="btn-icon" viewBox="0 0 16 16" fill="none" width="13" height="13">
            <path d="M2.5 6.5L8 2l5.5 4.5V14a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1V6.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
            <path d="M6 15V9h4v6" stroke="currentColor" stroke-width="1.4"/>
          </svg>
          <span>MENU</span>
        </button>
      </div>

      <button class="btn-share" on:click={handleShare}>
        <span>{copied ? 'SCORE COPIED TO CLIPBOARD!' : 'CHALLENGE A FRIEND'}</span>
        <span>→</span>
      </button>
    </div>

  </div>
</div>

<style>
  .end-screen {
    display: flex;
    justify-content: center;
    padding: 24px 20px;
    width: 100%;
  }

  .end-panel {
    background: #1a1a1a;
    border-radius: 8px;
    padding: 28px 24px;
    width: 100%;
    max-width: 680px;
    border: 1px solid #2e2e2e;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
  }

  .end-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .end-rank {
    font-size: 10.5px;
    color: #FFBD2E;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.08em;
    font-weight: 700;
  }

  .end-best {
    font-size: 10px;
    color: #FFBD2E;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.1em;
    font-weight: 700;
    background: rgba(255, 189, 46, 0.12);
    padding: 2px 8px;
    border-radius: 2px;
    border: 1px solid rgba(255, 189, 46, 0.3);
  }

  .end-score-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 4px;
  }

  .end-denom {
    font-size: 26px;
    color: #666;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
  }

  .end-tagline {
    font-size: 12px;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
    margin: 8px 0 22px;
    line-height: 1.6;
  }

  .chips-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 22px;
  }

  .chip {
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    height: 68px;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .chip-half { flex: 1; }

  .chip-score {
    position: absolute;
    top: 5px;
    left: 6px;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
    background: rgba(0, 0, 0, 0.45);
    padding: 1px 5px;
    border-radius: 2px;
    letter-spacing: 0.02em;
    user-select: none;
  }

  .chip-rnd {
    position: absolute;
    bottom: 5px;
    right: 6px;
    font-size: 8px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.7);
    font-family: 'JetBrains Mono', monospace;
    background: rgba(0, 0, 0, 0.4);
    padding: 1px 4px;
    border-radius: 2px;
  }

  .chip-skeleton {
    background: rgba(255, 255, 255, 0.06);
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.8; }
  }

  .end-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .end-btn-row {
    display: flex;
    gap: 10px;
  }

  .btn-primary {
    background: #fff;
    color: #1a1a1a;
    border: none;
    padding: 13px 18px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s, box-shadow 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-retry {
    flex: 1;
    background: #fff;
    box-shadow: 0 4px 14px rgba(255, 255, 255, 0.15);
  }

  .btn-primary:hover  {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(255, 255, 255, 0.22);
  }
  .btn-primary:active {
    transform: translateY(1px);
    box-shadow: 0 2px 6px rgba(255, 255, 255, 0.1);
  }

  .btn-badge {
    background: #1a1a1a;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 2px;
    margin-left: 2px;
  }

  .btn-secondary {
    background: transparent;
    color: #ddd;
    border: 1px solid #444;
    padding: 13px 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.06em;
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, transform 0.12s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
  }
  .btn-secondary:hover  {
    border-color: #888;
    color: #fff;
    transform: translateY(-1px);
  }
  .btn-secondary:active {
    transform: translateY(1px);
  }

  .btn-share {
    background: rgba(255, 255, 255, 0.04);
    color: #aaa;
    border: 1px dashed #333;
    padding: 11px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background-color 0.15s;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .btn-share:hover {
    border-color: #555;
    color: #fff;
    background-color: rgba(255, 255, 255, 0.08);
  }

  .btn-icon {
    flex-shrink: 0;
  }

  @media (max-width: 480px) {
    .chips-row {
      gap: 5px;
    }
    .chip {
      height: 56px;
    }
    .end-btn-row {
      flex-direction: column;
    }
  }
</style>
