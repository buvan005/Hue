<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import ScoreDisplay from './ScoreDisplay.svelte';

  export let result = null;
  export let round  = 1;
  export let total  = 5;

  const dispatch = createEventDispatcher();

  let msgVisible  = false;
  let revealKey   = '';
  let revealTimeout;

  // Delayed message reveal for dramatic effect
  $: currentRevealKey = result
    ? `${result.target.hex}-${result.guess.hex}-${result.score}`
    : '';
  $: if (currentRevealKey && currentRevealKey !== revealKey) {
    revealKey  = currentRevealKey;
    msgVisible = false;
    clearTimeout(revealTimeout);
    revealTimeout = setTimeout(() => { msgVisible = true; }, 700);
  }

  onDestroy(() => clearTimeout(revealTimeout));

  $: roundsLeft = total - round;
</script>

<!-- ── Two-card grid: Guess | Target ── -->
<div class="result-grid">
  <!-- Guess card -->
  <div class="color-card">
    <div class="color-swatch" style="background-color: {result?.guess.hex ?? '#aaa'};"></div>
    <div class="color-meta">
      <div class="color-meta-label">GUESS</div>
      <div class="color-meta-vals">H{result?.guess.h} · S{result?.guess.s} · B{result?.guess.b}</div>
    </div>
  </div>

  <!-- Target card -->
  <div class="color-card">
    <div class="color-swatch" style="background-color: {result?.target.hex ?? '#888'}; position: relative;">
      <span class="de-badge">ΔE {result?.dE}</span>
    </div>
    <div class="color-meta">
      <div class="color-meta-label">TARGET</div>
      <div class="color-meta-vals">H{result?.target.h} · S{result?.target.s} · B{result?.target.b}</div>
    </div>
  </div>
</div>

<hr class="result-divider" />

<!-- ── Score ── -->
<div class="score-row">
  <span class="score-label">SCORE</span>
  {#if result}
    <ScoreDisplay
      value={result.score}
      decimals={2}
      duration={900}
      delay={200}
      color="#1a1a1a"
      size="38px"
    />
  {/if}
  <span class="score-denom">/ 10</span>
</div>

<!-- ── Feedback quote ── -->
{#if msgVisible && result?.msg}
  <div in:fade={{ duration: 320 }} class="feedback-quote">
    "{result.msg}"
  </div>
{/if}

<hr class="result-divider" />

<!-- ── Footer: meta + Next button ── -->
<div class="result-footer">
  <span class="result-meta">
    ΔE {result?.dE} ·
    {roundsLeft > 0
      ? `${roundsLeft} round${roundsLeft !== 1 ? 's' : ''} left`
      : 'final round'}
  </span>
  <button
    class="next-btn"
    on:click={() => dispatch('next')}
    aria-label={round >= total ? 'See results' : 'Next round'}
  >
    {round >= total ? 'RESULTS →' : 'NEXT →'}
  </button>
</div>

<style>
  /* ── Two-card grid ── */
  .result-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-bottom: 14px;
  }

  .color-card {
    border: 1px solid #c8c3b8;
    border-radius: 6px;
    overflow: hidden;
  }

  .color-swatch {
    height: 110px;
    transition: background-color 0.08s ease;
  }

  /* ΔE badge on target swatch */
  .de-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 9px;
    letter-spacing: 0.08em;
    background: rgba(0, 0, 0, 0.28);
    color: #fff;
    padding: 2px 6px;
    border-radius: 2px;
    font-family: 'JetBrains Mono', monospace;
    user-select: none;
  }

  /* Card meta section */
  .color-meta {
    padding: 8px 10px;
    background: #F2EFE7;
    border-top: 1px solid #c8c3b8;
  }

  .color-meta-label {
    font-size: 8px;
    letter-spacing: 0.18em;
    color: #aaa;
    font-family: 'JetBrains Mono', monospace;
    margin-bottom: 3px;
  }

  .color-meta-vals {
    font-size: 11px;
    font-weight: 500;
    color: #1a1a1a;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Divider ── */
  .result-divider {
    border: none;
    border-top: 1px dashed #c8c3b8;
    margin: 12px 0;
  }

  /* ── Score row ── */
  .score-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 10px;
  }

  .score-label {
    font-size: 9px;
    letter-spacing: 0.18em;
    color: #aaa;
    font-family: 'JetBrains Mono', monospace;
    flex-shrink: 0;
  }

  .score-denom {
    font-size: 16px;
    color: #aaa;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Feedback blockquote ── */
  .feedback-quote {
    border-left: 3px solid #1a1a1a;
    padding-left: 10px;
    font-size: 12px;
    color: #555;
    font-family: 'JetBrains Mono', monospace;
    font-style: italic;
    margin-bottom: 12px;
    line-height: 1.5;
  }

  /* ── Result footer ── */
  .result-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .result-meta {
    font-size: 10px;
    color: #aaa;
    font-family: 'JetBrains Mono', monospace;
  }

  .next-btn {
    background: #1a1a1a;
    color: #F2EFE7;
    border: none;
    padding: 6px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    border-radius: 3px;
    cursor: pointer;
    letter-spacing: 0.08em;
    transition: opacity 0.15s, transform 0.15s;
  }
  .next-btn:hover  { opacity: 0.85; transform: translateX(2px); }
  .next-btn:active { transform: scale(0.96); }
</style>
