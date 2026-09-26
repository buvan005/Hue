<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade } from 'svelte/transition';

  export let bestScore = 0;

  const dispatch = createEventDispatcher();

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

  let hoveredColor = null;

  function handleKeydown(e) {
    if (e.key === 'Enter' || e.code === 'Space') {
      // Don't trigger if user is focusing another button
      if (document.activeElement?.tagName === 'BUTTON') return;
      e.preventDefault();
      dispatch('play');
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="start-wrapper" in:fade={{ duration: 250 }}>
  <div class="hero">

    <!-- ── Left Column ── -->
    <div class="hero-left">
      <div>
        <div class="game-badge">
          <div class="badge-dot"></div>
          <span class="badge-txt">COLOR MEMORY GAME</span>
        </div>

        <div class="title-row">
          <h1 class="hero-title">HUE</h1>
          <span class="cursor-blink">_</span>
        </div>

        <p class="hero-sub">
          Memorize a colour.<br />
          Recreate it from memory.<br />
          5 rounds. No second chances.
        </p>

        <div class="cta-row">
          <button class="btn-play" on:click={() => dispatch('play')}>
            <span>PLAY NOW →</span>
          </button>
          <button class="btn-daily" on:click={() => dispatch('daily')} title="Play today's seeded daily board">
            DAILY CHALLENGE
          </button>
        </div>

        <div class="key-hint">
          <span>hint: press <kbd>ENTER</kbd> or <kbd>SPACE</kbd> to begin</span>
        </div>

        <div class="stat-strip">
          <div class="stat-cell">
            <div class="stat-lbl">PLAYERS TODAY</div>
            <div class="stat-val">1,75,088</div>
          </div>
          <div class="stat-cell">
            <div class="stat-lbl">AVG SCORE</div>
            <div class="stat-val">22.4</div>
          </div>
          <div class="stat-cell">
            <div class="stat-lbl">TOP SCORE</div>
            <div class="stat-val">49.8</div>
          </div>
          <div class="stat-cell {bestScore > 0 ? 'stat-cell-highlight' : ''}">
            <div class="stat-lbl">YOUR BEST</div>
            <div class="stat-val">{bestScore > 0 ? bestScore.toFixed(2) : '—'}</div>
          </div>
        </div>
      </div>

      <!-- Scoring system guide -->
      <div class="scoring-guide">
        <div class="guide-title">SCORING SYSTEM · CIELAB ΔE ACCURACY</div>
        <div class="score-bars">
          <div class="tier-bar" style="background:#3B7B4B;">
            <span>9–10</span>
          </div>
          <div class="tier-bar" style="background:#6B96B4;">
            <span>6–8</span>
          </div>
          <div class="tier-bar" style="background:#C4A060;">
            <span>3–5</span>
          </div>
          <div class="tier-bar" style="background:#A04040;">
            <span>0–2</span>
          </div>
        </div>
        <div class="score-labels">
          <span>perfect</span>
          <span>good</span>
          <span>ok</span>
          <span>bold</span>
        </div>
      </div>
    </div>

    <!-- ── Right Column ── -->
    <div class="hero-right">
      <div class="right-top">
        <div class="spectrum-header">
          <span>COLOUR SPECTRUM · 32px GRID</span>
          {#if hoveredColor}
            <span class="hover-hex" in:fade={{ duration: 100 }}>{hoveredColor}</span>
          {/if}
        </div>

        <div class="pixel-art">
          {#each colors as color}
            <div
              class="px-swatch"
              style="background-color: {color};"
              on:mouseenter={() => (hoveredColor = color)}
              on:mouseleave={() => (hoveredColor = null)}
              role="button"
              tabindex="0"
              aria-label="Color {color}"
            ></div>
          {/each}
        </div>
      </div>

      <div class="right-bottom">
        <div class="leaderboard">
          <div class="lb-title">TODAY'S LEADERBOARD</div>

          <div class="lb-row">
            <span class="lb-rank">#1</span>
            <div class="lb-info">
              <div class="lb-name">spectral_mind</div>
              <div class="lb-bar-track">
                <div class="lb-bar" style="width: 98%;"></div>
              </div>
            </div>
            <span class="lb-score">49.8</span>
          </div>

          <div class="lb-row">
            <span class="lb-rank">#2</span>
            <div class="lb-info">
              <div class="lb-name">colour_hawk</div>
              <div class="lb-bar-track">
                <div class="lb-bar" style="width: 88%;"></div>
              </div>
            </div>
            <span class="lb-score">44.1</span>
          </div>

          <div class="lb-row">
            <span class="lb-rank">#3</span>
            <div class="lb-info">
              <div class="lb-name">hue_wizard</div>
              <div class="lb-bar-track">
                <div class="lb-bar" style="width: 79%;"></div>
              </div>
            </div>
            <span class="lb-score">39.6</span>
          </div>

          {#if bestScore > 0}
            <div class="lb-row lb-row-you">
              <span class="lb-rank">★</span>
              <div class="lb-info">
                <div class="lb-name">you (personal best)</div>
                <div class="lb-bar-track">
                  <div class="lb-bar lb-bar-you" style="width: {Math.min(100, (bestScore / 50) * 100)}%;"></div>
                </div>
              </div>
              <span class="lb-score">{bestScore.toFixed(2)}</span>
            </div>
          {/if}
        </div>
      </div>
    </div>

  </div>

  <!-- ── How to Play Section ── -->
  <div class="htp-section">
    <div class="htp-head">HOW TO PLAY</div>
    <div class="htp-grid">
      <div class="htp-step">
        <div class="htp-num">01</div>
        <div class="htp-title">
          <span class="htp-dot" style="background:#3B7B4B;"></span>MEMORIZE
        </div>
        <div class="htp-desc">
          A color fills the screen for about 2 seconds. Look closely — once it's gone, it's gone.
        </div>
      </div>

      <div class="htp-step">
        <div class="htp-num">02</div>
        <div class="htp-title">
          <span class="htp-dot" style="background:#6B96B4;"></span>GUESS
        </div>
        <div class="htp-desc">
          Drag the Hue, Saturation, and Brightness sliders until your guess matches what you remember.
        </div>
      </div>

      <div class="htp-step">
        <div class="htp-num">03</div>
        <div class="htp-title">
          <span class="htp-dot" style="background:#C4A060;"></span>SCORE
        </div>
        <div class="htp-desc">
          We compare your guess to the real color using CIELAB ΔE. The closer the match, the higher you score — up to 10 points.
        </div>
      </div>

      <div class="htp-step">
        <div class="htp-num">04</div>
        <div class="htp-title">
          <span class="htp-dot" style="background:#A04040;"></span>REPEAT
        </div>
        <div class="htp-desc">
          Play 5 rounds per game for a total of 50 points, and try to beat your personal best each time.
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .start-wrapper {
    width: 100%;
    background: #EDEAE0;
    color: #1a1a1a;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Hero Grid ── */
  .hero {
    display: grid;
    grid-template-columns: 1fr 340px;
    min-height: 480px;
  }

  .hero-left {
    padding: 36px 30px 28px;
    border-right: 1px dashed #C4BFB0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .hero-right {
    display: flex;
    flex-direction: column;
  }

  /* ── Badge & Title ── */
  .game-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: #E4E0D5;
    border: 1px solid #C4BFB0;
    border-radius: 2px;
    padding: 4px 10px;
    margin-bottom: 18px;
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
    color: #777;
    font-weight: 700;
  }

  .title-row {
    display: flex;
    align-items: flex-end;
    gap: 0;
    margin-bottom: 12px;
  }

  .hero-title {
    font-size: clamp(64px, 9vw, 88px);
    font-weight: 700;
    color: #1a1a1a;
    line-height: 0.9;
    letter-spacing: -0.03em;
  }

  .cursor-blink {
    font-size: clamp(64px, 9vw, 88px);
    font-weight: 700;
    color: #C4BFB0;
    line-height: 0.9;
    margin-left: 4px;
    user-select: none;
    animation: blink 1.1s step-start infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0; }
  }

  .hero-sub {
    font-size: 11px;
    color: #777;
    letter-spacing: 0.04em;
    margin-bottom: 24px;
    line-height: 1.65;
    border-left: 2px solid #1a1a1a;
    padding-left: 10px;
  }

  /* ── CTA Row ── */
  .cta-row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }

  .btn-play {
    background: #1a1a1a;
    color: #EDEAE0;
    border: none;
    padding: 13px 28px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    border-radius: 4px;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    transition: transform 0.12s ease, opacity 0.15s ease, box-shadow 0.15s ease;
  }

  .btn-play:hover {
    opacity: 0.92;
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  }

  .btn-play:active {
    transform: translateY(1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .btn-daily {
    background: transparent;
    color: #1a1a1a;
    border: 1px solid #C4BFB0;
    padding: 13px 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.1em;
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease, transform 0.12s ease;
  }

  .btn-daily:hover {
    border-color: #1a1a1a;
    background-color: rgba(26, 26, 26, 0.04);
    transform: translateY(-1px);
  }

  .btn-daily:active {
    transform: translateY(1px);
  }

  .key-hint {
    font-size: 9px;
    color: #999;
    letter-spacing: 0.04em;
    margin-bottom: 22px;
  }

  .key-hint kbd {
    background: #E4E0D5;
    border: 1px solid #C4BFB0;
    border-radius: 3px;
    padding: 1px 5px;
    font-family: inherit;
    font-size: 8px;
    color: #555;
  }

  /* ── Stat Strip ── */
  .stat-strip {
    display: flex;
    border: 1px dashed #C4BFB0;
    border-radius: 4px;
    overflow: hidden;
    background: #E8E5DC;
  }

  .stat-cell {
    flex: 1;
    padding: 9px 12px;
    border-right: 1px dashed #C4BFB0;
  }

  .stat-cell:last-child {
    border-right: none;
  }

  .stat-cell-highlight {
    background: rgba(255, 189, 46, 0.08);
  }

  .stat-lbl {
    font-size: 7px;
    letter-spacing: 0.18em;
    color: #888;
    margin-bottom: 3px;
    font-weight: 500;
  }

  .stat-val {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
  }

  /* ── Scoring Guide ── */
  .scoring-guide {
    border-top: 1px dashed #C4BFB0;
    padding-top: 14px;
    margin-top: 18px;
  }

  .guide-title {
    font-size: 8px;
    letter-spacing: 0.18em;
    color: #888;
    margin-bottom: 8px;
    font-weight: 600;
  }

  .score-bars {
    display: flex;
    gap: 3px;
    align-items: center;
  }

  .tier-bar {
    flex: 1;
    height: 16px;
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s ease, filter 0.15s ease;
  }

  .tier-bar:hover {
    transform: scaleY(1.15);
    filter: brightness(1.1);
  }

  .tier-bar span {
    font-size: 7.5px;
    color: rgba(255, 255, 255, 0.95);
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .score-labels {
    display: flex;
    gap: 3px;
    margin-top: 4px;
  }

  .score-labels span {
    flex: 1;
    font-size: 7.5px;
    color: #888;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Right Column: Pixel Art & Leaderboard ── */
  .right-top {
    padding: 22px 20px 16px;
    border-bottom: 1px dashed #C4BFB0;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .spectrum-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 8px;
    letter-spacing: 0.18em;
    color: #888;
    font-weight: 600;
  }

  .hover-hex {
    font-size: 8px;
    color: #1a1a1a;
    font-weight: 700;
    background: #E4E0D5;
    padding: 1px 6px;
    border-radius: 2px;
    border: 1px solid #C4BFB0;
  }

  .pixel-art {
    display: grid;
    grid-template-columns: repeat(18, 1fr);
    gap: 2.5px;
    padding: 6px 0;
  }

  .px-swatch {
    aspect-ratio: 1;
    border-radius: 1.5px;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s ease;
  }

  .px-swatch:hover {
    transform: scale(1.4);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    z-index: 10;
    position: relative;
  }

  .right-bottom {
    padding: 18px 20px;
  }

  .leaderboard {
    margin-top: 0;
  }

  .lb-title {
    font-size: 8px;
    letter-spacing: 0.18em;
    color: #888;
    margin-bottom: 10px;
    font-weight: 600;
  }

  .lb-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    border-bottom: 1px dashed #D4D0C8;
  }

  .lb-row:last-child {
    border-bottom: none;
  }

  .lb-row-you {
    background: rgba(255, 189, 46, 0.08);
    padding: 6px 6px;
    border-radius: 3px;
    margin-top: 4px;
    border: 1px solid rgba(255, 189, 46, 0.3);
  }

  .lb-rank {
    font-size: 9px;
    color: #888;
    min-width: 22px;
    font-weight: 700;
  }

  .lb-row-you .lb-rank {
    color: #b58000;
  }

  .lb-info {
    flex: 1;
    padding: 0 8px;
  }

  .lb-name {
    font-size: 9.5px;
    color: #1a1a1a;
    margin-bottom: 2px;
    font-weight: 500;
  }

  .lb-bar-track {
    height: 3px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 1px;
    overflow: hidden;
  }

  .lb-bar {
    height: 100%;
    background: #1a1a1a;
    border-radius: 1px;
    transition: width 0.6s ease;
  }

  .lb-bar-you {
    background: #b58000;
  }

  .lb-score {
    font-size: 10px;
    font-weight: 700;
    color: #1a1a1a;
  }

  /* ── How to Play Section ── */
  .htp-section {
    border-top: 1px dashed #C4BFB0;
    padding: 26px 30px 30px;
    background: #EAE6DC;
  }

  .htp-head {
    font-size: 10px;
    letter-spacing: 0.18em;
    color: #888;
    margin-bottom: 18px;
    font-weight: 700;
  }

  .htp-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }

  .htp-step {
    padding: 12px 18px;
    border-right: 1px dashed #C4BFB0;
    transition: background 0.15s ease;
  }

  .htp-step:last-child {
    border-right: none;
  }

  .htp-step:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  .htp-num {
    font-size: 26px;
    font-weight: 700;
    color: #C8C3B4;
    margin-bottom: 8px;
    font-family: 'JetBrains Mono', monospace;
    line-height: 1;
  }

  .htp-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
    margin-bottom: 1px;
  }

  .htp-title {
    font-size: 12px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 6px;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
  }

  .htp-desc {
    font-size: 11px;
    color: #666;
    line-height: 1.6;
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

    .htp-step:nth-child(1), .htp-step:nth-child(2) {
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
