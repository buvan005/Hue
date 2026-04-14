<script>
  import { createEventDispatcher } from 'svelte';
  import { hsbToRgb, hsbHex, luma } from '../engine/color.js';

  export let round   = 1;
  export let total   = 5;
  export let initial = { h: 180, s: 50, b: 50 };

  const dispatch = createEventDispatcher();

  let h = initial.h;
  let s = initial.s;
  let b = initial.b;
  let appliedInitialKey = '';

  // Reset sliders whenever a new round starts
  $: initialKey = initial ? `${initial.h}-${initial.s}-${initial.b}-${round}` : '';
  $: if (initialKey && initialKey !== appliedInitialKey) {
    appliedInitialKey = initialKey;
    h = initial.h;
    s = initial.s;
    b = initial.b;
  }

  // Live preview
  $: previewHex  = hsbHex(h, s, b);
  $: previewRgb  = hsbToRgb(h, s, b);
  $: previewLuma = luma(previewRgb.r, previewRgb.g, previewRgb.b);
  $: isDark      = previewLuma < 145;

  // ── Gradient tracks (to top = min at bottom, max at top) ──────────────────
  // Matches the rotated range input: min(left) → physical bottom after -90deg rotation
  //                                  max(right) → physical top  after -90deg rotation
  $: hueGrad = `linear-gradient(to top,
    hsl(0,100%,50%), hsl(30,100%,50%), hsl(60,100%,50%),
    hsl(90,100%,50%), hsl(120,100%,50%), hsl(150,100%,50%),
    hsl(180,100%,50%), hsl(210,100%,50%), hsl(240,100%,50%),
    hsl(270,100%,50%), hsl(300,100%,50%), hsl(330,100%,50%),
    hsl(360,100%,50%))`;

  $: satFull = (() => { const c = hsbToRgb(h, 100, b); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: satNone = (() => { const c = hsbToRgb(h,   0, b); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: satGrad = `linear-gradient(to top, ${satNone}, ${satFull})`;

  $: briFull = (() => { const c = hsbToRgb(h, s, 100); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: briGrad = `linear-gradient(to top, #000000, ${briFull})`;

  function handleSubmit() {
    dispatch('submit', { h, s, b });
  }
</script>

<div class="guess-layout">
  <!-- ── Left: Slider Panel ── -->
  <div class="slider-panel">

    <!-- HUE row -->
    <div class="slider-row">
      <span class="slider-label">H · HUE</span>
      <div class="slider-track" style="background: {hueGrad};" aria-label="Hue slider track">
        <input
          id="hue-slider"
          type="range" min="0" max="360" step="1"
          bind:value={h}
          aria-label="Hue"
        />
      </div>
      <span class="slider-val">{h}</span>
    </div>

    <!-- SATURATION row -->
    <div class="slider-row">
      <span class="slider-label">S · SAT</span>
      <div class="slider-track" style="background: {satGrad};" aria-label="Saturation slider track">
        <input
          id="sat-slider"
          type="range" min="0" max="100" step="1"
          bind:value={s}
          aria-label="Saturation"
        />
      </div>
      <span class="slider-val">{s}</span>
    </div>

    <!-- BRIGHTNESS row -->
    <div class="slider-row">
      <span class="slider-label">B · BRI</span>
      <div class="slider-track" style="background: {briGrad};" aria-label="Brightness slider track">
        <input
          id="bri-slider"
          type="range" min="0" max="100" step="1"
          bind:value={b}
          aria-label="Brightness"
        />
      </div>
      <span class="slider-val">{b}</span>
    </div>

  </div>

  <!-- ── Right: Preview Pane ── -->
  <div class="preview-pane">
    <!-- Live color preview fill -->
    <div class="preview-fill" style="background-color: {previewHex};">
      <span
        class="guess-round"
        style="color: {isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.30)'};"
      >
        {round} / {total}
      </span>

      <!-- Submit button -->
      <button
        on:click={handleSubmit}
        class="submit-btn"
        aria-label="Submit guess"
        style="background: {isDark ? 'rgba(255,255,255,0.94)' : '#1a1a1a'};"
      >
        <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14">
          <path
            d="M3 8l4 4 6-6"
            stroke={isDark ? '#111' : '#fff'}
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <!-- Info strip -->
    <div class="info-strip">
      <span class="strip-hsb">H{h} · S{s} · B{b}</span>
      <span class="strip-hex">{previewHex.toUpperCase()}</span>
    </div>
  </div>
</div>

<style>
  /* ── Layout ── */
  .guess-layout {
    display: grid;
    grid-template-columns: 152px 1fr;
    border: 1px solid #c8c3b8;
    border-radius: 6px;
    overflow: hidden;
  }

  /* ── Slider Panel (left column) ── */
  .slider-panel {
    background: #E9E5DC;
    padding: 12px 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border-right: 1px solid #c8c3b8;
  }

  .slider-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .slider-label {
    font-size: 9px;
    letter-spacing: 0.15em;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
    user-select: none;
  }

  /* ── Slider Track ── */
  /*
   * The track div is the visible gradient strip (height: 80px, full panel width).
   * The range input is rotated -90deg so its drag axis becomes vertical:
   *   input width  = track height (80px)  → becomes visual vertical span
   *   input height = track width  (132px) → becomes visual horizontal span
   */
  .slider-track {
    position: relative;
    height: 80px;
    border-radius: 3px;
    overflow: hidden;
    cursor: ns-resize;
  }

  .slider-track input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    /* Before rotation: width = drag length, height = thumb hit-area width */
    width: 80px;
    height: 132px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    background: transparent;
    outline: none;
    cursor: ns-resize;
    touch-action: none;
    margin: 0;
    padding: 0;
    z-index: 10;
  }

  /* Transparent track (gradient is on the parent div) */
  .slider-track input[type='range']::-webkit-slider-runnable-track {
    background: transparent;
    height: 0;
    border: none;
  }
  .slider-track input[type='range']::-moz-range-track {
    background: transparent;
    height: 0;
    border: none;
  }

  /* White pill thumb */
  .slider-track input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    border: 1px solid #c8c3b8;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.12);
    cursor: grab;
    transition: transform 0.10s ease, box-shadow 0.10s ease;
  }
  .slider-track input[type='range']:active::-webkit-slider-thumb {
    transform: scale(1.18);
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
    cursor: grabbing;
  }

  .slider-track input[type='range']::-moz-range-thumb {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    border: 1px solid #c8c3b8;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    cursor: grab;
  }

  .slider-val {
    font-size: 10px;
    color: #555;
    font-family: 'JetBrains Mono', monospace;
    text-align: center;
    font-variant-numeric: tabular-nums;
    user-select: none;
  }

  /* ── Preview Pane (right column) ── */
  .preview-pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .preview-fill {
    flex: 1;
    min-height: 220px;
    position: relative;
    transition: background-color 50ms ease;
  }

  .guess-round {
    position: absolute;
    top: 10px;
    right: 12px;
    font-size: 9px;
    letter-spacing: 0.15em;
    font-family: 'JetBrains Mono', monospace;
    user-select: none;
    pointer-events: none;
  }

  /* Submit button — floating above info strip */
  .submit-btn {
    position: absolute;
    bottom: 10px;
    right: 10px;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
    z-index: 5;
  }
  .submit-btn:hover {
    transform: scale(1.10);
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.30);
  }
  .submit-btn:active {
    transform: scale(0.92);
  }

  /* ── Info strip ── */
  .info-strip {
    background: #F2EFE7;
    border-top: 1px solid #c8c3b8;
    padding: 9px 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .strip-hsb {
    font-size: 10px;
    font-weight: 500;
    color: #555;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.06em;
  }

  .strip-hex {
    font-size: 10px;
    color: #aaa;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
  }

  /* ── Responsive ── */
  @media (max-width: 400px) {
    .guess-layout {
      grid-template-columns: 120px 1fr;
    }
    .slider-track {
      height: 68px;
    }
    .slider-track input[type='range'] {
      width: 68px;
      height: 100px;
    }
  }
</style>
