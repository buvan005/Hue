<script>
  import { createEventDispatcher } from 'svelte';
  import { hsbToRgb, hsbHex, luma } from './engine/color.js';

  export let round = 1;
  export let total = 5;
  export let initial = { h: 180, s: 50, b: 50 };

  const dispatch = createEventDispatcher();

  let h = initial.h;
  let s = initial.s;
  let b = initial.b;
  let appliedInitialKey = '';

  // ─── Reset sliders when a new round starts ────────────────────────────────
  $: initialKey = initial ? `${initial.h}-${initial.s}-${initial.b}-${round}` : '';
  $: if (initialKey && initialKey !== appliedInitialKey) {
    appliedInitialKey = initialKey;
    h = initial.h;
    s = initial.s;
    b = initial.b;
  }

  // ─── Derived color values ─────────────────────────────────────────────────
  $: previewHex = hsbHex(h, s, b);
  $: previewRgb = hsbToRgb(h, s, b);
  $: previewLuma = luma(previewRgb.r, previewRgb.g, previewRgb.b);
  $: isDark = previewLuma < 145;

  // ─── Gradient backgrounds for each slider column ──────────────────────────
  // Hue: full rainbow spectrum (constant, doesn't depend on S or B)
  $: hueGrad = `linear-gradient(to bottom,
    hsl(0,100%,50%), hsl(30,100%,50%), hsl(60,100%,50%),
    hsl(90,100%,50%), hsl(120,100%,50%), hsl(150,100%,50%),
    hsl(180,100%,50%), hsl(210,100%,50%), hsl(240,100%,50%),
    hsl(270,100%,50%), hsl(300,100%,50%), hsl(330,100%,50%),
    hsl(360,100%,50%))`;

  // Saturation: top = fully saturated at current H & B → bottom = desaturated
  $: satGradTop = (() => { const c = hsbToRgb(h, 100, b); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: satGradBot = (() => { const c = hsbToRgb(h, 0, b);   return `rgb(${c.r},${c.g},${c.b})`; })();
  $: satGrad = `linear-gradient(to bottom, ${satGradTop}, ${satGradBot})`;

  // Brightness: top = full brightness at current H & S → bottom = black
  $: briGradTop = (() => { const c = hsbToRgb(h, s, 100); return `rgb(${c.r},${c.g},${c.b})`; })();
  $: briGrad = `linear-gradient(to bottom, ${briGradTop}, #000000)`;

  function handleSubmit() {
    dispatch('submit', { h, s, b });
  }
</script>

<!-- Layout: 3 slider columns + color preview panel -->
<div class="guess-container">

  <!-- ─── HUE COLUMN ──────────────────────────────────────────────────── -->
  <div class="slider-col">
    <div class="col-grad" style="background: {hueGrad};"></div>
    <div class="col-label">H</div>
    <input
      type="range"
      min="0"
      max="360"
      step="1"
      bind:value={h}
      aria-label="Hue"
    />
  </div>

  <!-- ─── SATURATION COLUMN ───────────────────────────────────────────── -->
  <div class="slider-col">
    <div class="col-grad" style="background: {satGrad};"></div>
    <div class="col-label">S</div>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      bind:value={s}
      aria-label="Saturation"
    />
  </div>

  <!-- ─── BRIGHTNESS COLUMN ───────────────────────────────────────────── -->
  <div class="slider-col">
    <div class="col-grad" style="background: {briGrad};"></div>
    <div class="col-label">B</div>
    <input
      type="range"
      min="0"
      max="100"
      step="1"
      bind:value={b}
      aria-label="Brightness"
    />
  </div>

  <!-- ─── COLOR PREVIEW PANEL ─────────────────────────────────────────── -->
  <div class="preview-panel">
    <div class="preview-fill" style="background-color: {previewHex};">
      <!-- Round indicator -->
      <div
        class="preview-meta"
        style="color: {isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.22)'};"
      >
        {round} / {total}
      </div>

      <!-- Phase label -->
      <div
        class="preview-brand"
        style="color: {isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.16)'};"
      >
        guess
      </div>

      <!-- Submit button -->
      <button
        on:click={handleSubmit}
        aria-label="Submit guess"
        class="btn-submit"
        style="
          background: {isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.82)'};
          box-shadow: 0 4px 20px rgba(0,0,0,0.18), 0 1px 4px rgba(0,0,0,0.08);
        "
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none"
          stroke={isDark ? '#222' : '#fff'}
          stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="9"/>
          <circle cx="12" cy="12" r="3"/>
          <line x1="12" y1="2" x2="12" y2="5.5"/>
          <line x1="12" y1="18.5" x2="12" y2="22"/>
          <line x1="2" y1="12" x2="5.5" y2="12"/>
          <line x1="18.5" y1="12" x2="22" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- HSB info strip -->
    <div class="hsb-strip">
      <span class="strip-vals">H{h} S{s} B{b}</span>
      <span class="strip-hex">{previewHex.toUpperCase()}</span>
    </div>
  </div>
</div>

<style>
  /* ═══════════════════════════════════════════════════════
     GUESS CONTAINER — horizontal row: 3 slider columns + preview
  ═══════════════════════════════════════════════════════ */
  .guess-container {
    display: flex;
    flex-direction: row;
    height: 390px;
    width: 100%;
  }

  /* ───── Individual Slider Column ─────
     Each column is a fixed-width strip showing the gradient background.
     The range input is rotated -90° so vertical drag = value change. */
  .slider-col {
    width: 46px;
    flex-shrink: 0;
    position: relative;
    border-right: 1px solid rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }

  /* Gradient fills the entire column as the "track" visual */
  .col-grad {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  /* Column label (H / S / B) */
  .col-label {
    position: absolute;
    top: 6px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    z-index: 15;
    pointer-events: none;
    user-select: none;
  }

  /* ───── Range Input: Rotated Vertical ─────
     The <input type=range> is sized to match the column height (390px)
     then rotated -90deg so dragging up → increasing value.
     Its "thickness" matches the column width (46px). */
  .slider-col input[type='range'] {
    -webkit-appearance: none;
    appearance: none;
    width: 390px;
    height: 46px;
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

  /* Hide the native track — the column gradient IS the track */
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

  /* White circular thumb */
  .slider-col input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #fff;
    border: none;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.28), 0 0 0 1.5px rgba(0, 0, 0, 0.07);
    cursor: grab;
    transition: transform 0.13s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.13s cubic-bezier(0.4, 0, 0.2, 1);
    margin-top: 0;
  }
  .slider-col input[type='range']:active::-webkit-slider-thumb {
    transform: scale(1.2);
    box-shadow: 0 5px 22px rgba(0, 0, 0, 0.34), 0 0 0 1.5px rgba(0, 0, 0, 0.07);
    cursor: grabbing;
  }
  .slider-col input[type='range']::-moz-range-thumb {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: #fff;
    border: none;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.28);
    cursor: grab;
  }

  /* ───── Preview Panel ───── */
  .preview-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .preview-fill {
    flex: 1;
    position: relative;
    transition: background-color 0.05s;
  }

  .preview-meta {
    position: absolute;
    top: 16px;
    left: 20px;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.04em;
    pointer-events: none;
    user-select: none;
  }

  .preview-brand {
    position: absolute;
    top: 16px;
    right: 18px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    pointer-events: none;
    user-select: none;
  }

  .btn-submit {
    position: absolute;
    bottom: 16px;
    right: 16px;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.12s, box-shadow 0.12s;
    z-index: 5;
  }
  .btn-submit:hover {
    transform: scale(1.08);
    box-shadow: 0 6px 28px rgba(0, 0, 0, 0.24);
  }
  .btn-submit:active {
    transform: scale(0.93);
  }

  .hsb-strip {
    background: #fff;
    border-top: 1px solid rgba(0, 0, 0, 0.05);
    padding: 9px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }

  .strip-vals {
    font-size: 11px;
    font-weight: 600;
    color: #555;
    letter-spacing: 0.01em;
  }

  .strip-hex {
    font-size: 11px;
    font-weight: 400;
    color: #bbb;
    letter-spacing: 0.05em;
    font-variant-numeric: tabular-nums;
  }

  /* ─── Responsive: narrower columns on small screens ─── */
  @media (max-width: 440px) {
    .slider-col {
      width: 38px;
    }
    .slider-col input[type='range'] {
      width: 390px;
      height: 38px;
    }
  }
</style>
