<script>
  import { createEventDispatcher } from 'svelte';
  import { hsbToRgb, hsbHex, luma } from '../engine/color.js';

  export let round      = 1;
  export let total      = 5;
  export let initial    = { h: 180, s: 50, b: 50 };
  export let rounds     = [];
  export let totalScore = 0;
  export let bestScore  = 0;

  const dispatch = createEventDispatcher();

  // ── State ──
  let h = initial.h;
  let s = initial.s;
  let b = initial.b;
  let appliedKey = '';

  $: initKey = `${initial.h}-${initial.s}-${initial.b}-${round}`;
  $: if (initKey !== appliedKey) { appliedKey = initKey; h = initial.h; s = initial.s; b = initial.b; }

  // ── Live preview ──
  $: previewHex  = hsbHex(h, s, b);
  $: previewRgb  = hsbToRgb(h, s, b);
  $: previewLuma = luma(previewRgb.r, previewRgb.g, previewRgb.b);
  $: isDark      = previewLuma < 145;

  // ── Session stats ──
  $: avgDE = rounds.length > 0
    ? (rounds.reduce((sum, rr) => sum + rr.dE, 0) / rounds.length).toFixed(1)
    : '—';

  // ── Gradients ──
  $: hueGrad = `linear-gradient(to right,
    hsl(0,100%,50%),hsl(30,100%,50%),hsl(60,100%,50%),hsl(90,100%,50%),
    hsl(120,100%,50%),hsl(150,100%,50%),hsl(180,100%,50%),hsl(210,100%,50%),
    hsl(240,100%,50%),hsl(270,100%,50%),hsl(300,100%,50%),hsl(330,100%,50%),hsl(360,100%,50%))`;

  $: satFull = (() => { const c = hsbToRgb(h, 100, b); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: satNone = (() => { const c = hsbToRgb(h, 0,   b); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: satGrad = `linear-gradient(to right, ${satNone}, ${satFull})`;

  $: briFull = (() => { const c = hsbToRgb(h, s, 100); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: briGrad = `linear-gradient(to right, #000000, ${briFull})`;

  // ── Pointer-driven slider ──
  let activeSlider = null;
  let hueTrack, satTrack, briTrack;

  function getTrackEl(name) {
    if (name === 'hue') return hueTrack;
    if (name === 'sat') return satTrack;
    return briTrack;
  }

  function computeRatio(clientX, trackEl) {
    const rect = trackEl.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function applyRatio(name, ratio) {
    if (name === 'hue') h = Math.round(ratio * 360);
    else if (name === 'sat') s = Math.round(ratio * 100);
    else b = Math.round(ratio * 100);
  }

  function handlePointerDown(name, e) {
    e.preventDefault();
    activeSlider = name;
    const trackEl = getTrackEl(name);
    trackEl.setPointerCapture(e.pointerId);
    applyRatio(name, computeRatio(e.clientX, trackEl));
  }

  function handlePointerMove(name, e) {
    if (activeSlider !== name) return;
    e.preventDefault();
    applyRatio(name, computeRatio(e.clientX, getTrackEl(name)));
  }

  function handlePointerUp() { activeSlider = null; }

  function handleKeyDown(name, e) {
    const step = e.shiftKey ? 10 : 1;
    const max = name === 'hue' ? 360 : 100;
    let val = name === 'hue' ? h : name === 'sat' ? s : b;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); val = Math.min(max, val + step); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); val = Math.max(0, val - step); }
    else return;
    if (name === 'hue') h = val; else if (name === 'sat') s = val; else b = val;
  }

  $: huePercent = (h / 360) * 100;
  $: satPercent = (s / 100) * 100;
  $: briPercent = (b / 100) * 100;
</script>

<div class="main-layout">

  <!-- ══════════════ LEFT COL: sliders ══════════════ -->
  <div class="left-col">
    <div class="section-label">PHASE 2 / GUESS</div>

    <!-- Round pips -->
    <div class="round-indicator">
      {#each Array(total) as _, i}
        <div class="round-pip"
          class:active={i === round - 1}
          class:done={i < round - 1}></div>
      {/each}
    </div>

    <!-- HUE -->
    <div class="slider-block">
      <div class="slider-head">
        <span class="slider-key">H · HUE</span>
        <span class="slider-num">{h}</span>
      </div>
      <div
        class="slider-track-wrap"
        style="background:{hueGrad};"
        bind:this={hueTrack}
        on:pointerdown={(e) => handlePointerDown('hue', e)}
        on:pointermove={(e) => handlePointerMove('hue', e)}
        on:pointerup={handlePointerUp}
        on:pointercancel={handlePointerUp}
        on:lostpointercapture={handlePointerUp}
        role="slider" aria-label="Hue" aria-valuemin="0" aria-valuemax="360" aria-valuenow={h}
        tabindex="0" on:keydown={(e) => handleKeyDown('hue', e)}
      >
        <div class="slider-thumb" class:dragging={activeSlider === 'hue'} style="left:{huePercent}%;"></div>
      </div>
    </div>

    <!-- SATURATION -->
    <div class="slider-block">
      <div class="slider-head">
        <span class="slider-key">S · SATURATION</span>
        <span class="slider-num">{s}</span>
      </div>
      <div
        class="slider-track-wrap"
        style="background:{satGrad};"
        bind:this={satTrack}
        on:pointerdown={(e) => handlePointerDown('sat', e)}
        on:pointermove={(e) => handlePointerMove('sat', e)}
        on:pointerup={handlePointerUp}
        on:pointercancel={handlePointerUp}
        on:lostpointercapture={handlePointerUp}
        role="slider" aria-label="Saturation" aria-valuemin="0" aria-valuemax="100" aria-valuenow={s}
        tabindex="0" on:keydown={(e) => handleKeyDown('sat', e)}
      >
        <div class="slider-thumb" class:dragging={activeSlider === 'sat'} style="left:{satPercent}%;"></div>
      </div>
    </div>

    <!-- BRIGHTNESS -->
    <div class="slider-block">
      <div class="slider-head">
        <span class="slider-key">B · BRIGHTNESS</span>
        <span class="slider-num">{b}</span>
      </div>
      <div
        class="slider-track-wrap"
        style="background:{briGrad};"
        bind:this={briTrack}
        on:pointerdown={(e) => handlePointerDown('bri', e)}
        on:pointermove={(e) => handlePointerMove('bri', e)}
        on:pointerup={handlePointerUp}
        on:pointercancel={handlePointerUp}
        on:lostpointercapture={handlePointerUp}
        role="slider" aria-label="Brightness" aria-valuemin="0" aria-valuemax="100" aria-valuenow={b}
        tabindex="0" on:keydown={(e) => handleKeyDown('bri', e)}
      >
        <div class="slider-thumb" class:dragging={activeSlider === 'bri'} style="left:{briPercent}%;"></div>
      </div>
    </div>

    <!-- HSB bar -->
    <div class="hsb-bar" style="margin-top:auto;">
      <span class="hsb-val">H{h} · S{s} · B{b}</span>
      <span class="hsb-hex">{previewHex.toUpperCase()}</span>
    </div>
  </div>

  <!-- ══════════════ RIGHT COL: preview + sidebar ══════════════ -->
  <div class="right-col">
    <div class="section-label">LIVE PREVIEW</div>

    <!-- Big preview swatch -->
    <div class="preview-swatch" style="background-color:{previewHex};">
      <span class="preview-overlay"
        style="color:{isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)'};">
        YOUR GUESS
      </span>
      <span class="preview-round"
        style="color:{isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)'};">
        {round} / {total}
      </span>
      <div class="swatch-submit">
        <button
          class="submit-btn"
          style="background:{isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.82)'};"
          on:click={() => dispatch('submit', { h, s, b })}
          aria-label="Submit guess"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
            <path d="M3 8l4 4 6-6"
              stroke={isDark ? '#111' : '#fff'}
              stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Submit hint row -->
    <div class="submit-row">
      <span class="submit-hint">PRESS CHECK TO SUBMIT</span>
      <span class="delta-badge">ΔE —</span>
    </div>

    <!-- Round history -->
    <div class="history-section">
      <div class="section-label" style="margin-bottom:8px;">ROUND HISTORY</div>
      <div class="history-row">
        {#each Array(total) as _, i}
          {#if i < rounds.length}
            <div class="history-chip done" style="background:{rounds[i].guess.hex};"></div>
          {:else}
            <div class="history-chip"></div>
          {/if}
        {/each}
      </div>
      <div class="history-labels">
        {#each Array(total) as _, i}
          {#if i < rounds.length}
            <span class="hist-lbl hist-done">R{i+1}·{rounds[i].score.toFixed(1)}</span>
          {:else}
            <span class="hist-lbl hist-future">R{i+1}</span>
          {/if}
        {/each}
      </div>
    </div>

    <!-- Tip -->
    <div class="hint-block">
      <div class="info-label">TIP</div>
      <p class="hint-text">Adjust H first to lock the hue family, then tune S and B to match warmth and depth.</p>
    </div>

    <!-- Session stats -->
    <div class="info-panel">
      <div class="info-label">SESSION STATS</div>
      <div class="stats-grid">
        <div class="stat-cell">
          <div class="info-label">ROUND</div>
          <div class="stat-big">{round} / {total}</div>
        </div>
        <div class="stat-cell">
          <div class="info-label">SCORE SO FAR</div>
          <div class="stat-big">{totalScore > 0 ? totalScore.toFixed(2) : '—'}</div>
        </div>
        <div class="stat-cell">
          <div class="info-label">BEST</div>
          <div class="stat-big">{bestScore > 0 ? bestScore.toFixed(2) : '—'}</div>
        </div>
        <div class="stat-cell">
          <div class="info-label">AVG ΔE</div>
          <div class="stat-big">{avgDE}</div>
        </div>
      </div>
    </div>

  </div>
</div>

<style>
  /* ── Two-column layout ── */
  .main-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    min-height: 520px;
  }

  .left-col {
    padding: 16px 20px;
    border-right: 1px dashed #C8C3B4;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .right-col {
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* ── Shared labels ── */
  .section-label {
    font-size: 8px;
    letter-spacing: 0.20em;
    color: #AAA;
    margin-bottom: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 400;
  }

  .info-label {
    font-size: 8px;
    letter-spacing: 0.18em;
    color: #AAA;
    font-family: 'JetBrains Mono', monospace;
    margin-bottom: 2px;
  }

  /* ── Round pips ── */
  .round-indicator { display: flex; gap: 6px; margin-bottom: 16px; }
  .round-pip { height: 4px; flex: 1; border-radius: 2px; background: #C8C3B4; transition: background 0.2s; }
  .round-pip.active { background: #1a1a1a; }
  .round-pip.done   { background: #555; }

  /* ── Slider block ── */
  .slider-block { margin-bottom: 16px; }

  .slider-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }

  .slider-key {
    font-size: 9px;
    letter-spacing: 0.15em;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
  }

  .slider-num {
    font-size: 14px;
    font-weight: 700;
    color: #1a1a1a;
    min-width: 32px;
    text-align: right;
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
  }

  /* ── Custom slider track ── */
  .slider-track-wrap {
    position: relative;
    height: 52px;
    border-radius: 4px;
    border: 1px solid #C8C3B4;
    cursor: ew-resize;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    overflow: hidden;
  }

  .slider-thumb {
    position: absolute;
    top: 50%;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    border: 1.5px solid rgba(200,195,180,0.8);
    box-shadow: 0 1px 3px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.18);
    transform: translate(-50%, -50%);
    pointer-events: none;
    transition: box-shadow 0.1s ease;
    will-change: left;
    z-index: 2;
  }

  .slider-thumb.dragging {
    width: 28px;
    height: 28px;
    box-shadow: 0 2px 6px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.24);
  }

  .slider-track-wrap:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(26,26,26,0.2);
  }

  /* ── HSB bar ── */
  .hsb-bar {
    background: #E4E0D6;
    border: 1px dashed #C8C3B4;
    border-radius: 4px;
    padding: 8px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .hsb-val {
    font-size: 10px;
    color: #888;
    letter-spacing: 0.10em;
    font-family: 'JetBrains Mono', monospace;
  }

  .hsb-hex {
    font-size: 10px;
    color: #555;
    font-weight: 500;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.06em;
  }

  /* ── Preview swatch ── */
  .preview-swatch {
    border-radius: 6px;
    flex: 1;
    min-height: 220px;
    position: relative;
    border: 1px solid #C8C3B4;
    overflow: hidden;
    transition: background-color 55ms ease;
  }

  .preview-overlay {
    position: absolute;
    top: 10px;
    left: 12px;
    font-size: 8px;
    letter-spacing: 0.18em;
    font-family: 'JetBrains Mono', monospace;
  }

  .preview-round {
    position: absolute;
    top: 10px;
    right: 12px;
    font-size: 9px;
    letter-spacing: 0.10em;
    font-family: 'JetBrains Mono', monospace;
  }

  .swatch-submit {
    position: absolute;
    bottom: 12px;
    right: 12px;
  }

  .submit-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 12px rgba(0,0,0,0.22);
    transition: transform 0.14s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.14s;
  }
  .submit-btn:hover  { transform: scale(1.12); box-shadow: 0 4px 18px rgba(0,0,0,0.28); }
  .submit-btn:active { transform: scale(0.90); }

  /* ── Submit row ── */
  .submit-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .submit-hint {
    font-size: 9px;
    color: #AAA;
    letter-spacing: 0.08em;
    font-family: 'JetBrains Mono', monospace;
  }

  .delta-badge {
    font-size: 9px;
    color: #888;
    letter-spacing: 0.08em;
    background: #E4E0D6;
    padding: 2px 8px;
    border-radius: 2px;
    border: 1px solid #C8C3B4;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Round history ── */
  .history-section {
    border-top: 1px dashed #C8C3B4;
    padding-top: 10px;
  }

  .history-row {
    display: flex;
    gap: 5px;
    margin-bottom: 4px;
  }

  .history-chip {
    flex: 1;
    height: 28px;
    border-radius: 4px;
    background: #E4E0D6;
    border: 1px solid #C8C3B4;
    opacity: 0.35;
    transition: opacity 0.2s;
  }
  .history-chip.done { opacity: 1; }

  .history-labels {
    display: flex;
    gap: 5px;
  }

  .hist-lbl {
    flex: 1;
    text-align: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: 8px;
    letter-spacing: 0.10em;
  }
  .hist-done   { color: #AAA; }
  .hist-future { color: #C8C3B4; }

  /* ── Hint block ── */
  .hint-block {
    border-left: 2px solid #1a1a1a;
    padding: 6px 10px;
    background: #E4E0D6;
    border-radius: 0 4px 4px 0;
  }

  .hint-text {
    font-size: 10px;
    color: #666;
    font-style: italic;
    line-height: 1.55;
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Info panel ── */
  .info-panel {
    background: #E4E0D6;
    border: 1px dashed #C8C3B4;
    border-radius: 4px;
    padding: 10px 12px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 6px;
  }

  .stat-cell { display: flex; flex-direction: column; }

  .stat-big {
    font-size: 13px;
    font-weight: 700;
    color: #1a1a1a;
    font-family: 'JetBrains Mono', monospace;
    font-variant-numeric: tabular-nums;
    margin-top: 2px;
  }
</style>
