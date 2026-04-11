<script>
  import { createEventDispatcher } from 'svelte';
  import { hsbToRgb, hsbHex, luma } from '../engine/color.js';

  export let round = 1;
  export let total = 5;
  export let initial = { h: 180, s: 50, b: 50 };

  const dispatch = createEventDispatcher();

  let h = initial.h;
  let s = initial.s;
  let b = initial.b;
  let appliedInitialKey = '';

  // Reset sliders when a new round starts
  $: initialKey = initial ? `${initial.h}-${initial.s}-${initial.b}-${round}` : '';
  $: if (initialKey && initialKey !== appliedInitialKey) {
    appliedInitialKey = initialKey;
    h = initial.h;
    s = initial.s;
    b = initial.b;
  }

  // Derived color values
  $: previewHex = hsbHex(h, s, b);
  $: previewRgb = hsbToRgb(h, s, b);
  $: previewLuma = luma(previewRgb.r, previewRgb.g, previewRgb.b);
  $: isDark = previewLuma < 145;

  // ─── GRADIENT BACKGROUNDS ─────────────────────────────────────────────
  // CRITICAL: All gradients use "to top" because rotate(-90deg) maps
  // min→bottom, max→top. Gradient must go in the SAME direction:
  //   bottom = low value (start of gradient)
  //   top    = high value (end of gradient)

  // Hue: full rainbow — bottom=0° (red), top=360° (red)
  $: hueGrad = `linear-gradient(to top,
    hsl(0,100%,50%), hsl(30,100%,50%), hsl(60,100%,50%),
    hsl(90,100%,50%), hsl(120,100%,50%), hsl(150,100%,50%),
    hsl(180,100%,50%), hsl(210,100%,50%), hsl(240,100%,50%),
    hsl(270,100%,50%), hsl(300,100%,50%), hsl(330,100%,50%),
    hsl(360,100%,50%))`;

  // Saturation: bottom=0 (desaturated/gray), top=100 (fully saturated)
  $: satColorFull = (() => { const c = hsbToRgb(h, 100, b); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: satColorNone = (() => { const c = hsbToRgb(h, 0, b);   return `rgb(${c.r},${c.g},${c.b})`; })();
  $: satGrad = `linear-gradient(to top, ${satColorNone}, ${satColorFull})`;

  // Brightness: bottom=0 (black), top=100 (full brightness)
  $: briColorFull = (() => { const c = hsbToRgb(h, s, 100); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: briGrad = `linear-gradient(to top, #000000, ${briColorFull})`;

  function handleSubmit() {
    dispatch('submit', { h, s, b });
  }
</script>

<div class="guess-root">
  <!-- 3 Slider Columns -->
  <div class="sliders-rail">
    <!-- HUE -->
    <div class="slider-col">
      <div class="col-grad" style="background: {hueGrad};"></div>
      <span class="col-label">H</span>
      <input type="range" min="0" max="360" step="1" bind:value={h} aria-label="Hue" />
    </div>

    <!-- SATURATION -->
    <div class="slider-col">
      <div class="col-grad" style="background: {satGrad};"></div>
      <span class="col-label">S</span>
      <input type="range" min="0" max="100" step="1" bind:value={s} aria-label="Saturation" />
    </div>

    <!-- BRIGHTNESS -->
    <div class="slider-col">
      <div class="col-grad" style="background: {briGrad};"></div>
      <span class="col-label">B</span>
      <input type="range" min="0" max="100" step="1" bind:value={b} aria-label="Brightness" />
    </div>
  </div>

  <!-- Preview + Submit -->
  <div class="preview-panel">
    <div class="preview-fill" style="background-color: {previewHex};">
      <div class="preview-round" style="color: {isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.25)'};">
        {round} / {total}
      </div>
      <div class="preview-phase" style="color: {isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)'};">
        guess
      </div>

      <button
        on:click={handleSubmit}
        aria-label="Submit guess"
        class="btn-submit"
        style="background: {isDark ? 'rgba(255,255,255,0.94)' : 'rgba(0,0,0,0.84)'};"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none"
          stroke={isDark ? '#111' : '#fff'}
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </button>
    </div>

    <div class="info-strip">
      <span class="strip-hsb">H{h} · S{s} · B{b}</span>
      <span class="strip-hex">{previewHex.toUpperCase()}</span>
    </div>
  </div>
</div>

<style>
  .guess-root {
    display: flex;
    height: 400px;
    width: 100%;
  }

  /* ── Slider Rail (contains all 3 columns) ── */
  .sliders-rail {
    display: flex;
    flex-shrink: 0;
  }

  /* ── Individual Slider Column ── */
  .slider-col {
    width: 52px;
    position: relative;
    overflow: hidden;
  }

  .slider-col + .slider-col {
    border-left: 1px solid rgba(255, 255, 255, 0.12);
  }

  .col-grad {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .col-label {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.7);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
    z-index: 15;
    pointer-events: none;
    user-select: none;
  }

  /*
   * Range input rotated -90deg:
   *   min(0)   → physical BOTTOM
   *   max(360) → physical TOP
   * Gradients use "to top" so they match this direction.
   */
  .slider-col input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 400px;
    height: 52px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-90deg);
    background: transparent;
    cursor: ns-resize;
    outline: none;
    z-index: 10;
    touch-action: none;
    margin: 0;
    padding: 0;
  }

  .slider-col input[type='range']::-webkit-slider-runnable-track {
    background: transparent;
    height: 0;
    border: none;
  }
  .slider-col input[type='range']::-moz-range-track {
    background: transparent;
    height: 0;
    border: none;
  }

  .slider-col input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.08),
      0 2px 8px rgba(0, 0, 0, 0.32),
      0 1px 3px rgba(0, 0, 0, 0.16);
    cursor: grab;
    transition: transform 0.12s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.12s;
  }
  .slider-col input[type='range']:active::-webkit-slider-thumb {
    transform: scale(1.25);
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.1),
      0 4px 16px rgba(0, 0, 0, 0.4),
      0 2px 6px rgba(0, 0, 0, 0.2);
    cursor: grabbing;
  }

  .slider-col input[type='range']::-moz-range-thumb {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(255, 255, 255, 0.9);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.32);
    cursor: grab;
  }

  /* ── Preview Panel ── */
  .preview-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .preview-fill {
    flex: 1;
    position: relative;
    transition: background-color 50ms ease;
  }

  .preview-round {
    position: absolute;
    top: 18px;
    left: 22px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    pointer-events: none;
    user-select: none;
  }

  .preview-phase {
    position: absolute;
    top: 18px;
    right: 20px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    pointer-events: none;
    user-select: none;
  }

  .btn-submit {
    position: absolute;
    bottom: 18px;
    right: 18px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.22);
    transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
                box-shadow 0.15s;
    z-index: 5;
  }
  .btn-submit:hover {
    transform: scale(1.1);
    box-shadow: 0 6px 28px rgba(0, 0, 0, 0.3);
  }
  .btn-submit:active {
    transform: scale(0.92);
  }

  .info-strip {
    background: #fff;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    padding: 10px 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .strip-hsb {
    font-size: 11px;
    font-weight: 600;
    color: #444;
    letter-spacing: 0.02em;
  }

  .strip-hex {
    font-size: 11px;
    font-weight: 400;
    color: #aaa;
    letter-spacing: 0.04em;
    font-variant-numeric: tabular-nums;
    font-family: ui-monospace, 'SF Mono', 'Cascadia Code', monospace;
  }

  @media (max-width: 440px) {
    .slider-col {
      width: 42px;
    }
    .slider-col input[type='range'] {
      width: 400px;
      height: 42px;
    }
  }
</style>
