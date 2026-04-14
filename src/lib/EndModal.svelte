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

  onMount(() => {
    rank = rankLabel(totalScore, total * 10);
    const t = setTimeout(() => { stripVisible = true; }, 600);
    return () => clearTimeout(t);
  });

  function handleShare() {
    const text = `I scored ${totalScore.toFixed(2)}/${total * 10} on HUE. Can you beat me?`;
    if (navigator.share) {
      navigator.share({ title: 'HUE', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }
</script>

<!-- Dark end panel -->
<div class="end-panel">

  <!-- ── Top bar: rank + new best ── -->
  <div class="end-topbar">
    <span class="end-rank">{rank}</span>
    {#if isNewBest}
      <span in:fade={{ duration: 400 }} class="end-best">★ NEW BEST</span>
    {/if}
  </div>

  <!-- ── Total score ── -->
  <div class="end-score-row">
    <ScoreDisplay
      value={totalScore}
      decimals={2}
      duration={1200}
      delay={100}
      color="#fff"
      size="clamp(52px, 14vw, 72px)"
    />
    <span class="end-denom">/{total * 10}</span>
  </div>

  <!-- ── Tagline ── -->
  <p class="end-tagline">{endTagline(totalScore / total)}</p>

  <!-- ── Round chips ── -->
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
          <!-- Top half: guess color -->
          <div class="chip-half" style="background-color: {r.guess.hex};"></div>
          <!-- Bottom half: target color -->
          <div class="chip-half" style="background-color: {r.target.hex};"></div>
          <!-- Score badge -->
          <span class="chip-score">{r.score.toFixed(1)}</span>
        </div>
      {/each}
    </div>
  {:else}
    <!-- Skeleton while loading -->
    <div class="chips-row">
      {#each Array(total) as _}
        <div class="chip chip-skeleton"></div>
      {/each}
    </div>
  {/if}

  <!-- ── Actions ── -->
  <div class="end-actions">
    <button class="btn-primary" on:click={() => dispatch('playAgain')}>
      PLAY AGAIN
    </button>
    <button class="btn-secondary" on:click={handleShare}>
      CHALLENGE A FRIEND →
    </button>
    <button class="btn-ghost" on:click={() => dispatch('playAgain')}>
      Daily Challenge
    </button>
  </div>

</div>

<style>
  /* ── Dark container ── */
  .end-panel {
    background: #1a1a1a;
    border-radius: 6px;
    padding: 20px;
  }

  /* ── Top bar ── */
  .end-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  .end-rank {
    font-size: 10px;
    color: #FFBD2E;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.06em;
  }

  .end-best {
    font-size: 10px;
    color: #FFBD2E;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.08em;
  }

  /* ── Score ── */
  .end-score-row {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 4px;
  }

  .end-denom {
    font-size: 24px;
    color: #555;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
  }

  /* ── Tagline ── */
  .end-tagline {
    font-size: 12px;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
    margin: 6px 0 18px;
    line-height: 1.5;
  }

  /* ── Chips row ── */
  .chips-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 18px;
  }

  .chip {
    border-radius: 6px;
    overflow: hidden;
    position: relative;
    height: 64px;
    display: flex;
    flex-direction: column;
  }

  .chip-half {
    flex: 1;
  }

  .chip-score {
    position: absolute;
    top: 5px;
    left: 6px;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    font-family: 'JetBrains Mono', monospace;
    background: rgba(0, 0, 0, 0.38);
    padding: 1px 5px;
    border-radius: 2px;
    letter-spacing: 0.02em;
    user-select: none;
  }

  /* Skeleton chip */
  .chip-skeleton {
    background: rgba(255, 255, 255, 0.06);
    animation: pulse 1.4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 0.8; }
  }

  /* ── Action buttons ── */
  .end-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .btn-primary {
    background: #fff;
    color: #1a1a1a;
    border: none;
    padding: 11px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    border-radius: 4px;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.12s;
  }
  .btn-primary:hover  { opacity: 0.88; }
  .btn-primary:active { transform: scale(0.97); }

  .btn-secondary {
    background: transparent;
    color: #fff;
    border: 1px solid #444;
    padding: 11px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.05em;
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.15s, transform 0.12s;
  }
  .btn-secondary:hover  { border-color: #888; }
  .btn-secondary:active { transform: scale(0.97); }

  .btn-ghost {
    background: transparent;
    color: #555;
    border: none;
    padding: 9px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.05em;
    cursor: pointer;
    transition: color 0.15s;
  }
  .btn-ghost:hover { color: #aaa; }
</style>
