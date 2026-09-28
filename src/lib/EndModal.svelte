<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import ScoreDisplay from './ScoreDisplay.svelte';
  import { getPlayerStats } from '../api/stats.js';
  import { hsbHex } from '../engine/color.js';
  import { endTagline } from '../engine/scoring.js';

  export let rounds          = [];
  export let totalScore      = 0;
  export let total           = 5;
  export let isNewBest       = false;
  export let bestScore       = 0;
  export let userId          = null;
  export let username        = 'player';
  export let endStats        = null;
  export let endStatsLoading = false;
  export let endStatsError   = null;

  const dispatch = createEventDispatcher();

  let loadingStats = false;
  let statsError = false;
  let serverStats = null;

  $: if (endStats) {
    serverStats = endStats;
  }

  // Derive values with priority to serverStats, then props, then fallbacks
  $: personalBest = serverStats?.personalBest ?? serverStats?.bestScore ?? bestScore ?? totalScore;
  $: isBest = (serverStats?.isNewBest !== undefined) ? serverStats.isNewBest : isNewBest;
  $: globalRank = serverStats?.globalRank ?? serverStats?.rank ?? null;
  $: betterThan = serverStats?.percentageLower !== undefined
    ? serverStats.percentageLower
    : (serverStats?.percentile !== undefined ? serverStats.percentile : null);
  $: avgPlayerScore = serverStats?.averagePlayerScore ?? null;

  onMount(async () => {
    // If stats weren't already provided by completeGame response, fetch directly
    if (!serverStats && userId) {
      loadingStats = true;
      try {
        const data = await getPlayerStats(userId);
        if (data) {
          serverStats = data;
        }
      } catch (err) {
        console.warn('[HUE] Could not fetch player stats:', err.message);
        statsError = true;
      } finally {
        loadingStats = false;
      }
    }

    function handleKeydown(e) {
      if (e.key === 'r' || e.key === 'R') {
        if (document.activeElement?.tagName === 'BUTTON' || document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        dispatch('playAgain');
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function fmtScore(s) {
    return Number(s ?? 0).toFixed(1);
  }

  function getHex(c) {
    if (!c) return '#888888';
    if (c.hex) return c.hex;
    if (c.h !== undefined && c.s !== undefined && c.b !== undefined) {
      return hsbHex(c.h, c.s, c.b);
    }
    return '#888888';
  }
</script>

<div class="end-screen">
  <div class="end-panel">

    <!-- Header bar -->
    <div class="end-header">
      <div class="end-title-group">
        <span class="end-title">GAME COMPLETE</span>
        {#if username}
          <span class="end-player-tag">@{username}</span>
        {/if}
      </div>
      {#if isBest}
        <span in:fade={{ duration: 250 }} class="badge-new-best">NEW PERSONAL BEST</span>
      {/if}
    </div>

    <!-- Final Score Row -->
    <div class="score-section">
      <div class="score-row">
        <ScoreDisplay
          value={totalScore}
          decimals={1}
          duration={900}
          delay={50}
          color="#ffffff"
          size="clamp(44px, 11vw, 68px)"
        />
        <span class="score-denom">/ {total * 10}</span>
      </div>
      <p class="score-tagline">{endTagline(totalScore / total)}</p>
      {#if statsError || endStatsError}
        <span class="stats-notice">Statistics unavailable (offline mode)</span>
      {/if}
    </div>

    <!-- Real PostgreSQL Performance Metrics Grid -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">GLOBAL RANK</div>
        <div class="metric-value">
          {#if globalRank != null}
            #{globalRank}
          {:else if loadingStats || endStatsLoading}
            …
          {:else}
            —
          {/if}
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">BETTER THAN</div>
        <div class="metric-value">
          {#if betterThan != null}
            {betterThan}% <span class="metric-sub">OF PLAYERS</span>
          {:else if loadingStats || endStatsLoading}
            …
          {:else}
            —
          {/if}
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">PERSONAL BEST</div>
        <div class="metric-value">
          {fmtScore(personalBest)} <span class="metric-sub">/ {total * 10}</span>
        </div>
      </div>

      <div class="metric-card">
        <div class="metric-label">AVG PLAYER SCORE</div>
        <div class="metric-value">
          {#if avgPlayerScore != null && avgPlayerScore > 0}
            {fmtScore(avgPlayerScore)} <span class="metric-sub">/ {total * 10}</span>
          {:else if loadingStats || endStatsLoading}
            …
          {:else}
            —
          {/if}
        </div>
      </div>
    </div>

    <!-- Compact Round Performance Breakdown -->
    <div class="round-perf-section">
      <div class="section-title">ROUND PERFORMANCE</div>

      <div class="round-table">
        <div class="round-header-row">
          <span class="col-round">ROUND</span>
          <span class="col-swatches">TARGET & GUESS</span>
          <span class="col-score">SCORE</span>
        </div>

        {#each rounds as r, i}
          <div class="round-row">
            <span class="round-num">{pad(i + 1)}</span>
            <div class="swatches-cell">
              <div
                class="swatch target-swatch"
                style="background-color: {getHex(r.target)};"
                title="Target: {getHex(r.target)}"
              ></div>
              <span class="swatch-arrow">→</span>
              <div
                class="swatch guess-swatch"
                style="background-color: {getHex(r.guess)};"
                title="Guess: {getHex(r.guess)}"
              ></div>
              {#if r.dE !== undefined}
                <span class="de-tag">ΔE {r.dE}</span>
              {/if}
            </div>
            <span class="round-score">{fmtScore(r.score)}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Primary Actions: [ VIEW LEADERBOARD ]  [ PLAY AGAIN ] -->
    <div class="end-actions">
      <button
        class="btn-leaderboard"
        on:click={() => dispatch('viewLeaderboard')}
        title="View the live leaderboard without leaving results"
      >
        <svg class="btn-icon" viewBox="0 0 16 16" fill="none" width="13" height="13">
          <path d="M2 13h12M4 10v3M8 6v7M12 3v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>LEADERBOARD</span>
      </button>

      <button
        class="btn-play-again"
        on:click={() => { dispatch('playAgain'); dispatch('retry'); }}
        title="Play again immediately (Press R)"
      >
        <svg class="btn-icon" viewBox="0 0 16 16" fill="none" width="13" height="13">
          <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9L1.5 6.5M1.5 2v4.5H6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>PLAY AGAIN</span>
        <span class="kbd-badge">R</span>
      </button>
    </div>

    <!-- Return to Menu Option -->
    <div class="end-menu-opt">
      <button
        class="btn-menu-link"
        on:click={() => dispatch('home')}
        title="Return to main start screen"
      >
        ← RETURN TO MAIN MENU
      </button>
    </div>

  </div>
</div>

<style>
  .end-screen {
    display: flex;
    justify-content: center;
    padding: 20px 16px;
    width: 100%;
    box-sizing: border-box;
  }

  .end-panel {
    background: #1a1a1a;
    border-radius: 8px;
    padding: 24px 22px;
    width: 100%;
    max-width: 620px;
    border: 1px solid #2e2e2e;
    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
    box-sizing: border-box;
    font-family: 'JetBrains Mono', monospace;
  }

  .end-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .end-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .end-title {
    font-size: 11px;
    color: #888;
    letter-spacing: 0.12em;
    font-weight: 700;
  }

  .end-player-tag {
    font-size: 10.5px;
    color: #555;
    letter-spacing: 0.04em;
  }

  .badge-new-best {
    font-size: 10px;
    color: #FFBD2E;
    letter-spacing: 0.08em;
    font-weight: 700;
    background: rgba(255, 189, 46, 0.12);
    padding: 3px 8px;
    border-radius: 2px;
    border: 1px solid rgba(255, 189, 46, 0.35);
  }

  .score-section {
    margin-bottom: 18px;
  }

  .score-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    line-height: 1;
  }

  .score-denom {
    font-size: 24px;
    color: #666;
    font-weight: 700;
  }

  .score-tagline {
    font-size: 11.5px;
    color: #888;
    margin: 8px 0 0;
    line-height: 1.5;
  }

  .stats-notice {
    display: inline-block;
    font-size: 10px;
    color: #777;
    margin-top: 6px;
    font-style: italic;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin-bottom: 20px;
  }

  .metric-card {
    background: #222222;
    border: 1px solid #2c2c2c;
    border-radius: 4px;
    padding: 10px 12px;
  }

  .metric-label {
    font-size: 9px;
    color: #777;
    letter-spacing: 0.1em;
    font-weight: 700;
    margin-bottom: 5px;
  }

  .metric-value {
    font-size: 16px;
    color: #f0f0f0;
    font-weight: 700;
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .metric-sub {
    font-size: 10px;
    color: #666;
    font-weight: 500;
    letter-spacing: 0.04em;
  }

  .round-perf-section {
    margin-bottom: 22px;
  }

  .section-title {
    font-size: 10px;
    letter-spacing: 0.12em;
    color: #777;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .round-table {
    background: #222222;
    border: 1px solid #2c2c2c;
    border-radius: 4px;
    overflow: hidden;
  }

  .round-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px;
    font-size: 9px;
    color: #666;
    letter-spacing: 0.08em;
    border-bottom: 1px solid #2a2a2a;
    background: #1e1e1e;
  }

  .col-round {
    width: 44px;
  }

  .col-swatches {
    flex: 1;
    text-align: left;
    margin: 0 12px;
  }

  .col-score {
    text-align: right;
    width: 48px;
  }

  .round-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid #262626;
  }

  .round-row:last-child {
    border-bottom: none;
  }

  .round-num {
    font-size: 11px;
    color: #888;
    font-weight: 600;
    width: 44px;
  }

  .swatches-cell {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    margin: 0 12px;
  }

  .swatch {
    width: 26px;
    height: 15px;
    border-radius: 2px;
    border: 1px solid rgba(255, 255, 255, 0.16);
    flex-shrink: 0;
  }

  .swatch-arrow {
    font-size: 10px;
    color: #555;
  }

  .de-tag {
    font-size: 9px;
    color: #777;
    background: rgba(255, 255, 255, 0.04);
    padding: 1px 4px;
    border-radius: 2px;
    margin-left: 4px;
  }

  .round-score {
    font-size: 12px;
    font-weight: 700;
    color: #ffffff;
    text-align: right;
    width: 48px;
  }

  .end-actions {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  .btn-leaderboard {
    background: transparent;
    color: #ddd;
    border: 1px solid #444;
    padding: 12px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    border-radius: 4px;
    cursor: pointer;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: border-color 0.15s, color 0.15s, transform 0.12s;
  }

  .btn-leaderboard:hover {
    border-color: #888;
    color: #fff;
    transform: translateY(-1px);
  }

  .btn-leaderboard:active {
    transform: translateY(1px);
  }

  .btn-play-again {
    background: #ffffff;
    color: #1a1a1a;
    border: none;
    padding: 12px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.08em;
    border-radius: 4px;
    cursor: pointer;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 14px rgba(255, 255, 255, 0.12);
    transition: opacity 0.15s, transform 0.12s;
  }

  .btn-play-again:hover {
    opacity: 0.92;
    transform: translateY(-1px);
  }

  .btn-play-again:active {
    transform: translateY(1px);
  }

  .kbd-badge {
    background: #1a1a1a;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 2px;
    margin-left: 2px;
  }

  .btn-icon {
    flex-shrink: 0;
  }

  .end-menu-opt {
    margin-top: 14px;
    text-align: center;
  }

  .btn-menu-link {
    background: none;
    border: none;
    color: #666;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.08em;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 2px;
    transition: color 0.15s;
  }

  .btn-menu-link:hover {
    color: #bbb;
  }

  @media (max-width: 480px) {
    .metrics-grid {
      grid-template-columns: 1fr;
    }
    .end-actions {
      flex-direction: column;
    }
  }
</style>
