<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { getLeaderboard } from '../api/leaderboard.js';

  export let isOpen = false;
  export let currentUserId = null;
  export let currentUsername = '';

  const dispatch = createEventDispatcher();

  let selectedPeriod = 'daily'; // 'daily' | 'weekly' | 'all'
  let entries = [];
  let totalPlayers = 0;
  let topScore = 0;
  let loading = false;
  let error = null;
  let activeFetchId = 0;

  $: if (isOpen) {
    loadData(selectedPeriod);
  }

  async function loadData(period = 'daily') {
    selectedPeriod = period;
    loading = true;
    error = null;
    const fetchId = ++activeFetchId;

    try {
      const data = await getLeaderboard({ period, limit: 25 });
      if (fetchId !== activeFetchId) return; // Stale request guard

      const raw = data?.entries ?? [];
      // Defensive deduplication by unique player
      const seen = new Set();
      const unique = [];
      for (const e of raw) {
        const key = e.userId || e.username;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(e);
        }
      }

      entries = unique;
      totalPlayers = data?.totalPlayers ?? data?.total ?? entries.length;
      topScore = entries[0]?.score ?? entries[0]?.total_score ?? 0;
    } catch (err) {
      if (fetchId === activeFetchId) {
        console.warn('[HUE] Leaderboard fetch failed:', err.message);
        error = 'Unable to reach leaderboard server (offline mode)';
        entries = [];
        totalPlayers = 0;
      }
    } finally {
      if (fetchId === activeFetchId) {
        loading = false;
      }
    }
  }

  function fmtScore(s) {
    return Number(s ?? 0).toFixed(1);
  }

  function barWidth(score) {
    return Math.min(100, Math.max(4, Math.round((Number(score ?? 0) / 50) * 100)));
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      dispatch('close');
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if isOpen}
  <div
    class="modal-backdrop"
    in:fade={{ duration: 150 }}
    out:fade={{ duration: 120 }}
    on:click|self={() => dispatch('close')}
    on:keydown={(e) => { if (e.key === 'Escape') dispatch('close'); }}
    role="presentation"
  >
    <div
      class="modal-card"
      role="dialog"
      aria-modal="true"
      aria-label="Global Leaderboard"
      tabindex="-1"
      in:scale={{ start: 0.95, duration: 200, easing: cubicOut }}
      out:scale={{ start: 0.95, duration: 150, easing: cubicOut }}
    >
      <!-- Modal header -->
      <div class="modal-header">
        <div class="hdr-left">
          <span class="status-pip"></span>
          <span class="hdr-title">GLOBAL LEADERBOARD // CLASSIFIED</span>
        </div>
        <button
          class="btn-close"
          on:click={() => dispatch('close')}
          aria-label="Close leaderboard"
        >✕</button>
      </div>

      <!-- Controls bar: Tabs & Count -->
      <div class="controls-bar">
        <div class="period-tabs">
          <button
            class="tab-btn"
            class:active={selectedPeriod === 'daily'}
            on:click={() => loadData('daily')}
          >
            TODAY
          </button>
          <button
            class="tab-btn"
            class:active={selectedPeriod === 'weekly'}
            on:click={() => loadData('weekly')}
          >
            WEEK
          </button>
          <button
            class="tab-btn"
            class:active={selectedPeriod === 'all'}
            on:click={() => loadData('all')}
          >
            ALL-TIME
          </button>
        </div>

        <div class="stats-summary">
          <span class="summary-item">
            PLAYERS: <strong>{totalPlayers > 0 ? totalPlayers.toLocaleString() : '—'}</strong>
          </span>
          {#if topScore > 0}
            <span class="summary-sep">/</span>
            <span class="summary-item">
              TOP: <strong>{fmtScore(topScore)}</strong>
            </span>
          {/if}
        </div>
      </div>

      <!-- Leaderboard content list -->
      <div class="modal-body">
        {#if loading}
          <div class="state-message">
            <span class="blink-cursor">QUERYING SPECTRAL RANKINGS...</span>
          </div>
        {:else if error}
          <div class="state-message error">
            <span>{error}</span>
          </div>
        {:else if entries.length === 0}
          <div class="state-message empty">
            <span>NO SCORES RECORDED FOR THIS TIMEFRAME YET.</span>
          </div>
        {:else}
          <div class="leaderboard-table">
            <div class="table-header">
              <span class="th-rank">RANK</span>
              <span class="th-player">AGENT // USER</span>
              <span class="th-bar">PRECISION</span>
              <span class="th-score">SCORE</span>
            </div>

            <div class="table-body">
              {#each entries as entry, i}
                {@const isCurrentUser = (currentUserId && entry.userId === currentUserId) ||
                  (currentUsername && (entry.username?.toLowerCase() === currentUsername.toLowerCase()))}
                <div
                  class="lb-row"
                  class:current-user={isCurrentUser}
                  class:top-one={i === 0}
                  class:top-three={i < 3}
                >
                  <span class="lb-rank">
                    {#if i === 0}
                      🥇 #1
                    {:else if i === 1}
                      🥈 #2
                    {:else if i === 2}
                      🥉 #3
                    {:else}
                      #{entry.rank ?? (i + 1)}
                    {/if}
                  </span>

                  <div class="lb-player-cell">
                    <span class="player-name">{entry.username ?? 'player'}</span>
                    {#if isCurrentUser}
                      <span class="badge-you">YOU</span>
                    {/if}
                  </div>

                  <div class="lb-bar-cell">
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        style="width: {barWidth(entry.score ?? entry.total_score)}%;"
                      ></div>
                    </div>
                  </div>

                  <span class="lb-score-cell">
                    {fmtScore(entry.score ?? entry.total_score)}
                  </span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer navigation -->
      <div class="modal-footer">
        <span class="footer-note">Ranked by Personal Best · Tie-break: Earliest Completion</span>
        <div class="footer-buttons">
          <button class="btn-footer-home" on:click={() => dispatch('home')}>
            ← MENU
          </button>
          <button class="btn-footer-close" on:click={() => dispatch('close')}>
            CLOSE ✕
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(10, 10, 10, 0.78);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    font-family: 'JetBrains Mono', monospace;
  }

  .modal-card {
    background: #181818;
    border: 1px solid #333333;
    border-radius: 8px;
    width: 100%;
    max-width: 660px;
    max-height: 88vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.65);
    overflow: hidden;
  }

  /* Header */
  .modal-header {
    background: #202020;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #2e2e2e;
  }

  .hdr-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-pip {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #28C840;
    box-shadow: 0 0 6px rgba(40, 200, 64, 0.4);
  }

  .hdr-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #e0e0e0;
  }

  .btn-close {
    background: none;
    border: none;
    color: #888;
    font-size: 13px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 2px;
    font-family: inherit;
    transition: color 0.12s, background 0.12s;
  }

  .btn-close:hover {
    color: #fff;
    background: #333;
  }

  /* Controls Bar */
  .controls-bar {
    background: #1c1c1c;
    padding: 10px 16px;
    border-bottom: 1px solid #282828;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  .period-tabs {
    display: flex;
    gap: 4px;
    background: #141414;
    padding: 3px;
    border-radius: 4px;
    border: 1px solid #282828;
  }

  .tab-btn {
    background: transparent;
    border: none;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.08em;
    padding: 4px 10px;
    border-radius: 3px;
    cursor: pointer;
    transition: color 0.12s, background 0.12s;
  }

  .tab-btn:hover {
    color: #eee;
  }

  .tab-btn.active {
    background: #EDEAE0;
    color: #1a1a1a;
  }

  .stats-summary {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    color: #777;
    letter-spacing: 0.08em;
  }

  .stats-summary strong {
    color: #e0e0e0;
  }

  .summary-sep {
    color: #444;
  }

  /* Body */
  .modal-body {
    padding: 14px 16px;
    overflow-y: auto;
    flex: 1;
    min-height: 260px;
  }

  .state-message {
    height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #888;
    letter-spacing: 0.1em;
    font-style: italic;
    text-align: center;
  }

  .blink-cursor {
    animation: blink 1.2s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }

  .state-message.error {
    color: #FF5F57;
  }

  /* Table */
  .leaderboard-table {
    display: flex;
    flex-direction: column;
    border: 1px solid #262626;
    border-radius: 4px;
    overflow: hidden;
  }

  .table-header {
    background: #141414;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #666;
    border-bottom: 1px solid #222222;
  }

  .th-rank {
    width: 60px;
  }

  .th-player {
    flex: 1;
  }

  .th-bar {
    width: 120px;
    margin: 0 10px;
  }

  .th-score {
    width: 50px;
    text-align: right;
  }

  .table-body {
    display: flex;
    flex-direction: column;
  }

  .lb-row {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 1px solid #222222;
    background: #181818;
    transition: background 0.1s;
  }

  .lb-row:last-child {
    border-bottom: none;
  }

  .lb-row:hover {
    background: #1f1f1f;
  }

  .lb-row.current-user {
    background: rgba(255, 189, 46, 0.08);
    border-left: 2px solid #FFBD2E;
  }

  .lb-rank {
    width: 60px;
    font-size: 10px;
    font-weight: 700;
    color: #888;
    letter-spacing: 0.04em;
  }

  .top-three .lb-rank {
    color: #f0f0f0;
  }

  .lb-player-cell {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .player-name {
    font-size: 11px;
    font-weight: 600;
    color: #e0e0e0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .current-user .player-name {
    color: #FFBD2E;
    font-weight: 700;
  }

  .badge-you {
    font-size: 8px;
    font-weight: 700;
    background: #FFBD2E;
    color: #1a1a1a;
    padding: 1px 4px;
    border-radius: 2px;
    letter-spacing: 0.08em;
  }

  .lb-bar-cell {
    width: 120px;
    margin: 0 10px;
  }

  .bar-track {
    height: 4px;
    background: #2a2a2a;
    border-radius: 2px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: #888;
    border-radius: 2px;
  }

  .current-user .bar-fill {
    background: #FFBD2E;
  }

  .top-one .bar-fill {
    background: #28C840;
  }

  .lb-score-cell {
    width: 50px;
    text-align: right;
    font-size: 12px;
    font-weight: 700;
    color: #ffffff;
  }

  .current-user .lb-score-cell {
    color: #FFBD2E;
  }

  /* Footer */
  .modal-footer {
    background: #141414;
    padding: 10px 16px;
    border-top: 1px solid #282828;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .footer-note {
    font-size: 8.5px;
    color: #666;
    letter-spacing: 0.05em;
  }

  .footer-buttons {
    display: flex;
    gap: 8px;
  }

  .btn-footer-home {
    background: transparent;
    color: #888;
    border: 1px solid #333;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    padding: 5px 10px;
    border-radius: 3px;
    cursor: pointer;
    transition: color 0.12s, border-color 0.12s;
  }

  .btn-footer-home:hover {
    color: #eee;
    border-color: #666;
  }

  .btn-footer-close {
    background: #EDEAE0;
    color: #1a1a1a;
    border: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    font-weight: 700;
    padding: 5px 12px;
    border-radius: 3px;
    cursor: pointer;
    transition: opacity 0.12s;
  }

  .btn-footer-close:hover {
    opacity: 0.88;
  }

  @media (max-width: 540px) {
    .lb-bar-cell, .th-bar {
      display: none;
    }
  }
</style>
