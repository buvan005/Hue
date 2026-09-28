<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { getLeaderboard } from '../api/leaderboard.js';
  import { validateUsername } from '../stores/gameStore.js';

  export let bestScore = 0;
  export let initialUsername = '';

  const dispatch = createEventDispatcher();

  let username = initialUsername || '';

  $: trimmedName = (username || '').trim();
  $: usernameValidation = validateUsername(trimmedName);
  $: isValidName = usernameValidation.valid;

  const colors = [
    '#E85D4A','#E8A24A','#E8D44A','#A2C44A','#4AC44A','#4AC4A2',
    '#4AA2C4','#4A62C4','#824AC4','#C44AA2','#C44A62','#C4824A',
    '#7B3F3F','#7B6B3F','#4A7B3F','#3F7B6B','#3F4A7B','#6B3F7B',
    '#D4927A','#D4B87A','#A8D47A','#7AD4A8','#7AA8D4','#A87AD4',
    '#F0C8B4','#F0DEB4','#D0F0B4','#B4F0D0','#B4D0F0','#D0B4F0',
    '#9E5A5A','#9E835A','#6A9E5A','#5A9E83','#5A6A9E','#835A9E',
    '#C47060','#C49A60','#88C460','#60C49A','#6088C4','#9A60C4',
    '#3A2A2A','#3A342A','#2A3A2A','#2A3A34','#2A2A3A','#342A3A',
    '#E06060','#E0A060','#C0E060','#60E0A0','#60A0E0','#A060E0',
    '#F5E6D0','#EAE0D5','#D5EAE0','#D0D5EA','#E0D5EA','#EAD5D5',
    '#6B4040','#6B5A40','#4A6B40','#406B5A','#404A6B','#5A406B',
    '#B87050','#B89050','#80B850','#50B890','#5080B8','#9050B8'
  ];

  let hoveredHex = '';

  // ── Leaderboard state ─────────────────────────────────────────────────────
  let leaderboardEntries = [];
  let lbLoading = true;
  let lbTopScore = 0;
  let lbAvgScore = 0;
  let lbPlayerCount = 0;
  let selectedPeriod = 'daily'; // 'daily' | 'weekly' | 'all'

  let activeFetchId = 0;

  async function loadLeaderboard(period = 'daily') {
    selectedPeriod = period;
    lbLoading = true;
    const currentFetchId = ++activeFetchId;

    try {
      const data = await getLeaderboard({ limit: 10, period });
      if (currentFetchId !== activeFetchId) return; // Ignore stale async responses

      const rawEntries = data?.entries ?? data?.leaderboard ?? [];
      
      // Defensive deduplication by username/userId
      const seen = new Set();
      const unique = [];
      for (const e of rawEntries) {
        const key = e.userId || e.username;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(e);
        }
      }

      leaderboardEntries = unique.slice(0, 10);
      lbTopScore = leaderboardEntries[0]?.score ?? leaderboardEntries[0]?.total_score ?? 0;

      // Compute average from leaderboard entries
      if (leaderboardEntries.length > 0) {
        const sum = leaderboardEntries.reduce((acc, e) => acc + (e.score ?? e.total_score ?? 0), 0);
        lbAvgScore = Number((sum / leaderboardEntries.length).toFixed(1));
      }

      lbPlayerCount = data?.totalPlayers ?? data?.total ?? leaderboardEntries.length;
    } catch {
      if (currentFetchId === activeFetchId) {
        leaderboardEntries = [];
      }
    } finally {
      if (currentFetchId === activeFetchId) {
        lbLoading = false;
      }
    }
  }

  onMount(() => {
    loadLeaderboard('daily');
  });

  function handlePlay() {
    if (!isValidName) return;
    dispatch('play', { username: usernameValidation.username });
  }

  function handleDaily() {
    if (!isValidName) return;
    dispatch('daily', { username: usernameValidation.username });
  }

  /** Format a score to one decimal */
  function fmt(n) { return Number(n ?? 0).toFixed(1); }

  /** Bar width as percentage of max score (50 points max) */
  function barWidth(score) { return Math.min(100, Math.round((score / 50) * 100)); }

</script>


<div class="start-page" in:fade={{ duration: 200 }}>
  <div class="hero">
    <div class="hero-left">
      <div>
        <div class="game-badge">
          <div class="badge-dot"></div>
          <span class="badge-txt">COLOR MEMORY GAME</span>
        </div>

        <div class="title-row">
          <div class="hero-title">HUE</div>
          <span class="cursor-blink">_</span>
        </div>

        <p class="hero-sub">
          Memorize a colour.<br />
          Recreate it from memory.<br />
          5 rounds. No second chances.
        </p>

        <div class="user-row">
          <span class="user-prefix">AGENT //</span>
          <input
            class="user-input"
            type="text"
            placeholder="enter username"
            bind:value={username}
            maxlength="20"
            spellcheck="false"
            on:keydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (isValidName) handlePlay();
              }
            }}
          />
          <button
            class="btn-dossier"
            on:click={() => dispatch('openStats')}
            title="View Player Dossier & Statistics"
          >
            DOSSIER
          </button>
        </div>

        <div class="cta-row">
          <button
            class="btn-play"
            disabled={!isValidName}
            on:click={handlePlay}
            title={isValidName ? 'Start standard game' : 'Enter a username (2-20 chars) to play'}
          >PLAY NOW →</button>
          <button
            class="btn-daily"
            disabled={!isValidName}
            on:click={handleDaily}
            title={isValidName ? 'Start daily challenge' : 'Enter a username (2-20 chars) to play'}
          >DAILY CHALLENGE</button>
        </div>

        <div class="stat-strip">
          <div class="stat-cell">
            <div class="stat-lbl">PLAYERS TODAY</div>
            <div class="stat-val">{lbPlayerCount > 0 ? lbPlayerCount.toLocaleString() : '—'}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-lbl">AVG SCORE</div>
            <div class="stat-val">{lbAvgScore > 0 ? lbAvgScore : '—'}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-lbl">TOP SCORE</div>
            <div class="stat-val">{lbTopScore > 0 ? fmt(lbTopScore) : '—'}</div>
          </div>
          <div class="stat-cell">
            <div class="stat-lbl">YOUR BEST</div>
            <div class="stat-val">{bestScore > 0 ? bestScore.toFixed(2) : '—'}</div>
          </div>
        </div>
      </div>

      <div class="scoring-wrap">
        <div class="scoring-head">SCORING SYSTEM</div>
        <div class="score-bars">
          <div class="s-bar" style="background:#3B7B4B;">
            <span>9–10</span>
          </div>
          <div class="s-bar" style="background:#6B96B4;">
            <span>6–8</span>
          </div>
          <div class="s-bar" style="background:#C4A060;">
            <span>3–5</span>
          </div>
          <div class="s-bar" style="background:#A04040;">
            <span>0–2</span>
          </div>
        </div>
        <div class="score-labels">
          <div>perfect</div>
          <div>good</div>
          <div>ok</div>
          <div>bold</div>
        </div>
      </div>
    </div>

    <div class="hero-right">
      <div class="right-top">
        <div class="spec-head">
          <span>COLOUR SPECTRUM · 32px GRID</span>
          {#if hoveredHex}
            <span class="spec-hex">{hoveredHex}</span>
          {/if}
        </div>

        <div class="pixel-art" id="pxart">
          {#each colors as c}
            <div
              class="px"
              style="background:{c};"
              on:mouseenter={() => (hoveredHex = c)}
              on:mouseleave={() => (hoveredHex = '')}
              role="button"
              tabindex="0"
              aria-label="Color {c}"
            ></div>
          {/each}
        </div>
      </div>

      <div class="right-bottom">
        <div class="leaderboard">
          <div class="lb-header-bar">
            <span class="lb-title">LEADERBOARD</span>
            <div class="lb-tabs">
              <button
                class="lb-tab"
                class:active={selectedPeriod === 'daily'}
                on:click={() => loadLeaderboard('daily')}
              >TODAY</button>
              <button
                class="lb-tab"
                class:active={selectedPeriod === 'weekly'}
                on:click={() => loadLeaderboard('weekly')}
              >WEEK</button>
              <button
                class="lb-tab"
                class:active={selectedPeriod === 'all'}
                on:click={() => loadLeaderboard('all')}
              >ALL</button>
            </div>
          </div>

          {#if lbLoading}
            <div class="lb-empty">loading…</div>
          {:else if leaderboardEntries.length === 0}
            <div class="lb-empty">no scores yet for this period.</div>
          {:else}
            {#each leaderboardEntries as entry, i}
              <div class="lb-row">
                <span class="lb-rank">#{i + 1}</span>
                <div class="lb-info">
                  <div class="lb-name">{entry.username ?? entry.user?.username ?? 'player'}</div>
                  <div class="lb-bar-track">
                    <div class="lb-bar" style="width:{barWidth(entry.total_score ?? entry.score ?? entry.totalScore ?? 0)}%"></div>
                  </div>
                </div>
                <span class="lb-score">{fmt(entry.total_score ?? entry.score ?? entry.totalScore ?? 0)}</span>
              </div>
            {/each}
          {/if}
        </div>
      </div>

    </div>
  </div>

  <div class="htp-section">
    <div class="htp-head">HOW TO PLAY</div>
    <div class="htp-grid">
      <div class="htp-step">
        <div class="htp-num">01</div>
        <div class="htp-title"><span class="htp-dot" style="background:#3B7B4B"></span>MEMORIZE</div>
        <div class="htp-desc">A color fills the screen for about 2 seconds. Look closely — once it's gone, it's gone.</div>
      </div>
      <div class="htp-step">
        <div class="htp-num">02</div>
        <div class="htp-title"><span class="htp-dot" style="background:#6B96B4"></span>GUESS</div>
        <div class="htp-desc">Drag the Hue, Saturation and Brightness sliders until your guess matches what you remember.</div>
      </div>
      <div class="htp-step">
        <div class="htp-num">03</div>
        <div class="htp-title"><span class="htp-dot" style="background:#C4A060"></span>SCORE</div>
        <div class="htp-desc">We compare your guess to the real color. The closer the match, the higher you score — up to 10 points.</div>
      </div>
      <div class="htp-step">
        <div class="htp-num">04</div>
        <div class="htp-title"><span class="htp-dot" style="background:#A04040"></span>REPEAT</div>
        <div class="htp-desc">Play 5 rounds per game for a total of 50 points, and try to beat your personal best each time.</div>
      </div>
    </div>
  </div>
</div>

<style>
  .start-page {
    background: #EDEAE0;
    font-family: 'JetBrains Mono', monospace;
    width: 100%;
  }

  .hero {
    display: grid;
    grid-template-columns: 1fr 340px;
    min-height: 480px;
  }

  .hero-left {
    padding: 40px 28px 28px;
    border-right: 1px dashed #C4BFB0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .hero-right {
    display: flex;
    flex-direction: column;
  }

  .game-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #E4E0D5;
    border: 1px solid #C4BFB0;
    border-radius: 2px;
    padding: 4px 10px;
    margin-bottom: 20px;
  }

  .badge-dot {
    width: 6px;
    height: 6px;
    background: #1a1a1a;
    border-radius: 50%;
  }

  .badge-txt {
    font-size: 8px;
    letter-spacing: 0.2em;
    color: #888;
    font-weight: 700;
  }

  .title-row {
    display: flex;
    align-items: flex-end;
    gap: 0;
    margin-bottom: 8px;
  }

  .hero-title {
    font-size: clamp(64px, 10vw, 88px);
    font-weight: 700;
    color: #1a1a1a;
    line-height: 0.9;
    letter-spacing: -0.02em;
  }

  .cursor-blink {
    font-size: clamp(64px, 10vw, 88px);
    font-weight: 700;
    color: #C4BFB0;
    line-height: 0.9;
    margin-left: 4px;
    animation: blink 1.2s infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0.3; }
  }

  .hero-sub {
    font-size: 11px;
    color: #888;
    letter-spacing: 0.05em;
    margin-bottom: 20px;
    line-height: 1.6;
    border-left: 2px solid #1a1a1a;
    padding-left: 10px;
  }

  .user-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 18px;
    background: #E4DFD2;
    padding: 6px 12px;
    border-radius: 4px;
    border: 1px solid #D4CEBF;
    max-width: 360px;
  }

  .user-prefix {
    font-size: 10px;
    font-weight: 700;
    color: #888;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .user-input {
    flex: 1;
    background: transparent;
    border: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 600;
    color: #1a1a1a;
    letter-spacing: 0.05em;
    outline: none;
    min-width: 0;
  }

  .user-input::placeholder {
    color: #999;
    font-weight: 400;
  }

  .btn-dossier {
    background: #D8D2C2;
    border: 1px solid #BFB8A5;
    color: #555;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.1em;
    padding: 3px 6px;
    border-radius: 2px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    white-space: nowrap;
  }

  .btn-dossier:hover {
    background: #1a1a1a;
    color: #EDEAE0;
    border-color: #1a1a1a;
  }

  .cta-row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }

  .btn-play {
    background: #1a1a1a;
    color: #EDEAE0;
    border: none;
    padding: 12px 28px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    border-radius: 3px;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
  }
  .btn-play:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }
  .btn-play:active {
    transform: translateY(1px);
  }
  .btn-play:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    transform: none;
    pointer-events: none;
  }

  .btn-daily {
    background: transparent;
    color: #1a1a1a;
    border: 1px solid #C4BFB0;
    padding: 12px 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    border-radius: 3px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }
  .btn-daily:hover {
    background: rgba(0, 0, 0, 0.04);
    border-color: #1a1a1a;
  }
  .btn-daily:disabled {
    opacity: 0.35;
    cursor: not-allowed;
    border-color: #D4CEBF;
    pointer-events: none;
  }

  .stat-strip {
    display: flex;
    gap: 0;
    border: 1px dashed #C4BFB0;
    border-radius: 3px;
    overflow: hidden;
  }

  .stat-cell {
    flex: 1;
    padding: 8px 12px;
    border-right: 1px dashed #C4BFB0;
  }
  .stat-cell:last-child {
    border-right: none;
  }

  .stat-lbl {
    font-size: 7px;
    letter-spacing: 0.18em;
    color: #AAA;
    margin-bottom: 3px;
    font-weight: 500;
  }

  .stat-val {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
  }

  .scoring-wrap {
    border-top: 1px dashed #C4BFB0;
    padding-top: 14px;
    margin-top: 14px;
  }

  .scoring-head {
    font-size: 8px;
    letter-spacing: 0.18em;
    color: #AAA;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .score-bars {
    display: flex;
    gap: 3px;
    align-items: center;
  }

  .s-bar {
    flex: 1;
    height: 14px;
    border-radius: 1px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .s-bar span {
    font-size: 7px;
    color: rgba(255, 255, 255, 0.8);
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
  }

  .score-labels {
    display: flex;
    gap: 3px;
    margin-top: 3px;
  }

  .score-labels div {
    flex: 1;
    font-size: 7px;
    color: #888;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Right Column: Pixel Art & Leaderboard ── */
  .right-top {
    padding: 20px;
    border-bottom: 1px dashed #C4BFB0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .spec-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8px;
    letter-spacing: 0.18em;
    color: #AAA;
    font-weight: 600;
  }

  .spec-hex {
    color: #1a1a1a;
    font-weight: 700;
  }

  .pixel-art {
    display: grid;
    grid-template-columns: repeat(18, 1fr);
    gap: 2px;
    padding: 4px 0 12px;
  }

  .px {
    aspect-ratio: 1;
    border-radius: 1px;
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .px:hover {
    transform: scale(1.3);
    z-index: 2;
  }

  .right-bottom {
    padding: 16px 20px;
  }

  .leaderboard {
    margin-top: 0;
  }

  .lb-header-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .lb-title {
    font-size: 8px;
    letter-spacing: 0.18em;
    color: #AAA;
    font-weight: 600;
  }

  .lb-tabs {
    display: flex;
    gap: 4px;
  }

  .lb-tab {
    background: transparent;
    border: none;
    font-family: 'JetBrains Mono', monospace;
    font-size: 7.5px;
    font-weight: 700;
    color: #888;
    padding: 2px 4px;
    border-radius: 2px;
    cursor: pointer;
    letter-spacing: 0.08em;
    transition: color 0.15s, background 0.15s;
  }

  .lb-tab:hover {
    color: #1a1a1a;
  }

  .lb-tab.active {
    background: #1a1a1a;
    color: #EDEAE0;
  }

  .lb-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 5px 0;
    border-bottom: 1px dashed #D4D0C8;
  }

  .lb-row:last-child {
    border-bottom: none;
  }

  .lb-rank {
    font-size: 9px;
    color: #AAA;
    min-width: 20px;
    font-weight: 700;
  }

  .lb-info {
    flex: 1;
    padding: 0 8px;
  }

  .lb-name {
    font-size: 10px;
    color: #1a1a1a;
    margin-bottom: 3px;
  }

  .lb-bar-track {
    height: 3px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 1px;
    overflow: hidden;
  }

  .lb-bar {
    height: 100%;
    background: #1a1a1a;
    border-radius: 1px;
  }

  .lb-score {
    font-size: 10px;
    font-weight: 700;
    color: #1a1a1a;
  }

  .lb-empty {
    font-size: 9px;
    color: #AAA;
    padding: 10px 0;
    letter-spacing: 0.06em;
    font-style: italic;
  }

  /* ── How to Play ── */
  .htp-section {
    border-top: 1px dashed #C4BFB0;
    padding: 28px 32px 32px;
  }

  .htp-head {
    font-size: 11px;
    letter-spacing: 0.18em;
    color: #AAA;
    margin-bottom: 20px;
    font-weight: 700;
  }

  .htp-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }

  .htp-step {
    padding: 16px 20px;
    border-right: 1px dashed #C4BFB0;
  }

  .htp-step:last-child {
    border-right: none;
  }

  .htp-num {
    font-size: 28px;
    font-weight: 700;
    color: #D4D0C8;
    margin-bottom: 10px;
    font-family: 'JetBrains Mono', monospace;
    line-height: 1;
  }

  .htp-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 8px;
    margin-bottom: 2px;
  }

  .htp-title {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 8px;
    letter-spacing: 0.02em;
    display: flex;
    align-items: center;
  }

  .htp-desc {
    font-size: 12px;
    color: #6b6b63;
    line-height: 1.65;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .hero {
      grid-template-columns: 1fr;
    }

    .hero-left {
      border-right: none;
      border-bottom: 1px dashed #C4BFB0;
      padding: 24px 20px;
    }

    .right-top, .right-bottom {
      padding: 18px 20px;
    }

    .htp-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .htp-step:nth-child(2) {
      border-right: none;
    }

    .htp-step:nth-child(1),
    .htp-step:nth-child(2) {
      border-bottom: 1px dashed #C4BFB0;
    }
  }

  @media (max-width: 480px) {
    .htp-grid {
      grid-template-columns: 1fr;
    }

    .htp-step {
      border-right: none;
      border-bottom: 1px dashed #C4BFB0;
    }

    .htp-step:last-child {
      border-bottom: none;
    }

    .stat-strip {
      flex-direction: column;
    }

    .stat-cell {
      border-right: none;
      border-bottom: 1px dashed #C4BFB0;
    }

    .stat-cell:last-child {
      border-bottom: none;
    }
  }
</style>
