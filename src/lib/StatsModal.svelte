<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { getPlayerStats } from '../api/stats.js';

  export let isOpen = false;
  export let userId = null;
  export let username = 'player';
  export let bestScore = 0;

  const dispatch = createEventDispatcher();

  let stats = null;
  let loading = true;
  let error = null;

  $: if (isOpen && userId) {
    fetchStats();
  }

  async function fetchStats() {
    loading = true;
    error = null;
    try {
      stats = await getPlayerStats(userId);
    } catch (err) {
      console.warn('[HUE] Could not fetch player stats:', err.message);
      error = err.message || 'Offline mode: statistics not reachable';
      // Local fallback representation
      stats = {
        username,
        gamesPlayed: bestScore > 0 ? 1 : 0,
        bestScore: bestScore || 0,
        averageScore: bestScore || 0,
        bestRoundScore: bestScore > 0 ? Number((bestScore / 5).toFixed(2)) : 0,
        averageRoundScore: bestScore > 0 ? Number((bestScore / 5).toFixed(2)) : 0,
        rank: null,
        percentile: null,
        recentGames: []
      };
    } finally {
      loading = false;
    }
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
      aria-label="Player Dossier"
      tabindex="-1"
      in:scale={{ start: 0.95, duration: 200, easing: cubicOut }}
      out:scale={{ start: 0.95, duration: 150, easing: cubicOut }}
    >
      <!-- Terminal header -->
      <div class="modal-header">
        <div class="hdr-left">
          <span class="status-pip"></span>
          <span class="hdr-title">DOSSIER // {username.toUpperCase()}</span>
        </div>
        <button
          class="btn-close"
          on:click={() => dispatch('close')}
          aria-label="Close dossier"
        >✕</button>
      </div>

      <!-- Modal Body -->
      <div class="modal-body">
        {#if loading}
          <div class="loading-state">
            <span class="blink-cursor">QUERYING SPECTRAL DATABASE...</span>
          </div>
        {:else if stats}
          <!-- Top summary row -->
          <div class="profile-hero">
            <div class="profile-meta">
              <span class="profile-rank">
                {stats.rank ? `#${stats.rank} GLOBAL` : 'UNRANKED'}
              </span>
              {#if stats.percentile !== null && stats.percentile !== undefined}
                <span class="profile-pct">TOP {Math.max(1, 100 - Math.round(stats.percentile))}%</span>
              {/if}
            </div>
            <div class="profile-ident">{stats.username || username}</div>
          </div>

          <!-- Stats 4-cell grid -->
          <div class="stats-grid">
            <div class="stat-box">
              <span class="sb-label">GAMES PLAYED</span>
              <span class="sb-value">{stats.gamesPlayed}</span>
            </div>
            <div class="stat-box">
              <span class="sb-label">BEST SCORE</span>
              <span class="sb-value highlight">{stats.bestScore > 0 ? stats.bestScore.toFixed(2) : '—'}</span>
            </div>
            <div class="stat-box">
              <span class="sb-label">AVG SCORE</span>
              <span class="sb-value">{stats.averageScore > 0 ? stats.averageScore.toFixed(2) : '—'}</span>
            </div>
            <div class="stat-box">
              <span class="sb-label">BEST ROUND</span>
              <span class="sb-value">{stats.bestRoundScore > 0 ? stats.bestRoundScore.toFixed(2) : '—'}</span>
            </div>
          </div>

          <!-- Recent sessions -->
          <div class="recent-section">
            <div class="section-title">RECENT SESSIONS</div>
            {#if stats.recentGames && stats.recentGames.length > 0}
              <div class="recent-list">
                {#each stats.recentGames as g, idx}
                  <div class="recent-row">
                    <span class="r-idx">0{idx + 1}</span>
                    <span class="r-mode">{g.mode ? g.mode.toUpperCase() : 'STANDARD'}</span>
                    <span class="r-score">{Number(g.score || 0).toFixed(2)} pts</span>
                    <span class="r-date">
                      {g.completedAt ? new Date(g.completedAt).toLocaleDateString() : 'recent'}
                    </span>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="recent-empty">No logged games recorded yet. Complete 5 rounds to calibrate.</div>
            {/if}
          </div>
        {/if}

        {#if error}
          <div class="offline-note">
            ℹ {error}
          </div>
        {/if}
      </div>

      <!-- Modal Footer -->
      <div class="modal-footer">
        <span class="footer-note">PRESS ESC OR CLICK OUTSIDE TO CLOSE</span>
        <button class="btn-dismiss" on:click={() => dispatch('close')}>DISMISS [ESC]</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(18, 18, 18, 0.72);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
    font-family: 'JetBrains Mono', monospace;
  }

  .modal-card {
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    width: 100%;
    max-width: 520px;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
    overflow: hidden;
    color: #e5e5e5;
  }

  .modal-header {
    background: #282828;
    padding: 10px 16px;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .hdr-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-pip {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #28C840;
    box-shadow: 0 0 6px rgba(40, 200, 64, 0.6);
  }

  .hdr-title {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    color: #ccc;
  }

  .btn-close {
    background: transparent;
    border: none;
    color: #888;
    font-size: 13px;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 3px;
    transition: color 0.15s, background 0.15s;
  }

  .btn-close:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.1);
  }

  .modal-body {
    padding: 20px;
  }

  .loading-state {
    padding: 40px 0;
    text-align: center;
    font-size: 11px;
    color: #999;
  }

  .blink-cursor {
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% { opacity: 0.3; }
  }

  .profile-hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding-bottom: 14px;
    border-bottom: 1px dashed #3a3a3a;
    margin-bottom: 16px;
  }

  .profile-ident {
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.04em;
  }

  .profile-meta {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .profile-rank {
    font-size: 10px;
    font-weight: 700;
    color: #FFBD2E;
    background: rgba(255, 189, 46, 0.12);
    padding: 2px 6px;
    border-radius: 2px;
    border: 1px solid rgba(255, 189, 46, 0.25);
  }

  .profile-pct {
    font-size: 9px;
    color: #888;
    letter-spacing: 0.08em;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    margin-bottom: 18px;
  }

  .stat-box {
    background: #252525;
    padding: 10px 12px;
    border-radius: 4px;
    border: 1px solid #333;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sb-label {
    font-size: 8px;
    letter-spacing: 0.14em;
    color: #888;
    font-weight: 600;
  }

  .sb-value {
    font-size: 16px;
    font-weight: 700;
    color: #ddd;
  }

  .sb-value.highlight {
    color: #28C840;
  }

  .recent-section {
    border-top: 1px dashed #333;
    padding-top: 14px;
  }

  .section-title {
    font-size: 8px;
    letter-spacing: 0.16em;
    color: #888;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .recent-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: #242424;
    border-radius: 3px;
    font-size: 10px;
  }

  .r-idx {
    color: #666;
    font-weight: 700;
    width: 24px;
  }

  .r-mode {
    color: #aaa;
    flex: 1;
    letter-spacing: 0.08em;
  }

  .r-score {
    font-weight: 700;
    color: #fff;
    margin-right: 12px;
  }

  .r-date {
    color: #666;
    font-size: 9px;
  }

  .recent-empty {
    font-size: 10px;
    color: #666;
    font-style: italic;
    padding: 12px 0;
  }

  .offline-note {
    margin-top: 12px;
    font-size: 9px;
    color: #FFBD2E;
    background: rgba(255, 189, 46, 0.08);
    padding: 6px 10px;
    border-radius: 3px;
  }

  .modal-footer {
    background: #242424;
    padding: 10px 16px;
    border-top: 1px solid #333;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .footer-note {
    font-size: 8px;
    color: #666;
    letter-spacing: 0.08em;
  }

  .btn-dismiss {
    background: #333;
    color: #eee;
    border: 1px solid #444;
    border-radius: 3px;
    padding: 4px 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    cursor: pointer;
    letter-spacing: 0.06em;
    transition: background 0.15s;
  }

  .btn-dismiss:hover {
    background: #444;
  }
</style>
