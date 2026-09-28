<script>
  import { onMount, onDestroy } from 'svelte';

  export let height = '100%';

  let containerEl;
  let canvasEl;
  let animId = null;
  let resizeObserver = null;

  // Buffer resolution for super-smooth 60fps render
  const BUFFER_W = 160;
  const BUFFER_H = 120;
  let offscreenCanvas;
  let offscreenCtx;
  let imgData;
  let dataBuffer;

  // Mouse & interaction state
  let targetMx = 0;
  let targetMy = 0;
  let currentMx = 0;
  let currentMy = 0;
  let isHovered = false;
  let ripples = [];

  // Exactly 2 patterns: Flowing Gradient & Liquid Distortion
  const CYCLE_DURATION = 6.0; // seconds per cycle
  const TRANSITION_DURATION = 2.0; // cross-fade transition window

  let activePatternName = 'FLOWING GRADIENT';
  let blendProgress = 0;
  let prefersReducedMotion = false;

  // 1. Flowing Gradient
  function patternFlowingGradient(u, v, t) {
    const w1 = Math.sin(u * 2.5 + t * 0.8) * Math.cos(v * 2.2 - t * 0.6);
    const w2 = Math.sin((u + v) * 1.6 + t * 0.4);
    const w3 = Math.cos(Math.sqrt(u * u + v * v) * 2.8 - t * 0.5);
    return (w1 + w2 + w3) / 3.0; // normalized ~ [-1, 1]
  }

  // 2. Liquid Distortion
  function patternLiquidDistortion(u, v, t) {
    const u2 = u + 0.22 * Math.sin(v * 3.5 + t * 1.1);
    const v2 = v + 0.22 * Math.cos(u * 3.5 - t * 0.9);
    const wave = Math.sin(u2 * 2.8 + t * 0.7) * Math.cos(v2 * 2.8 - t * 0.7);
    const ripple = 0.3 * Math.sin((u2 - v2) * 3.0 + t);
    return (wave + ripple) / 1.3;
  }

  // Pure vibrant, high-luminance color palette mapper (NO BLACK, NO DARK MUD)
  // Value is in [0, 1]
  function vibrantColorMap(val, t, mouseInfluence) {
    // Rotating vibrant hue spectrum
    const hue = (val * 320 + t * 24 + mouseInfluence * 35) % 360;

    // Keep saturation high & vibrant (80% - 95%)
    const sat = 0.85 + 0.12 * Math.sin(val * Math.PI * 2);

    // Keep lightness high (52% - 68%) — NEVER DROPS INTO DARK/BLACK
    const light = 0.54 + 0.14 * Math.sin(val * Math.PI + t * 0.3);

    // HSL to RGB conversion
    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    const hk = (hue < 0 ? hue + 360 : hue) / 360;

    const tr = (hk + 1/3) % 1;
    const tg = hk;
    const tb = (hk < 1/3 ? hk + 2/3 : hk - 1/3);

    function hueToRgb(tc) {
      if (tc < 1/6) return p + (q - p) * 6 * tc;
      if (tc < 1/2) return q;
      if (tc < 2/3) return p + (q - p) * (2/3 - tc) * 6;
      return p;
    }

    return [
      Math.round(hueToRgb(tr) * 255),
      Math.round(hueToRgb(tg) * 255),
      Math.round(hueToRgb(tb) * 255)
    ];
  }

  function render(timestamp) {
    if (!canvasEl || !offscreenCtx) return;

    const time = prefersReducedMotion ? timestamp * 0.0001 : timestamp * 0.001;

    // Smooth pointer chase
    currentMx += (targetMx - currentMx) * 0.08;
    currentMy += (targetMy - currentMy) * 0.08;

    // Cross-fade between only 2 patterns:
    // 0 = Flowing Gradient, 1 = Liquid Distortion
    const phaseInCycle = (time % (CYCLE_DURATION * 2)) / (CYCLE_DURATION * 2);
    // Smooth sinusoidal oscillation between 0.0 and 1.0
    const blend = 0.5 - 0.5 * Math.cos(phaseInCycle * Math.PI * 2);
    blendProgress = blend;
    activePatternName = blend < 0.5 ? 'FLOWING GRADIENT' : 'LIQUID DISTORTION';

    // Update ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.radius += r.speed;
      r.alpha -= 0.016;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        ripples.splice(i, 1);
      }
    }

    const data = dataBuffer;
    let ptr = 0;

    for (let y = 0; y < BUFFER_H; y++) {
      const ny = (y / BUFFER_H) * 2 - 1;

      for (let x = 0; x < BUFFER_W; x++) {
        const nx = (x / BUFFER_W) * 2 - 1;

        // Subtle pointer distortion
        const dx = nx - currentMx;
        const dy = ny - currentMy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const warp = isHovered ? Math.exp(-dist * 2.8) * 0.25 : 0;

        // Ripples
        let ripVal = 0;
        for (let j = 0; j < ripples.length; j++) {
          const r = ripples[j];
          const rx = nx - r.x;
          const ry = ny - r.y;
          const rDist = Math.sqrt(rx * rx + ry * ry);
          const rDiff = Math.abs(rDist - r.radius);
          if (rDiff < 0.16) {
            ripVal += Math.cos((rDiff / 0.16) * Math.PI * 0.5) * r.alpha * 0.35;
          }
        }

        const effU = nx + dx * warp;
        const effV = ny + dy * warp;

        const valFlowing = patternFlowingGradient(effU, effV, time);
        const valLiquid = patternLiquidDistortion(effU, effV, time);

        // Interpolated blend between the 2 patterns
        const combined = (1 - blend) * valFlowing + blend * valLiquid + ripVal;

        // Map strictly to [0, 1]
        const normalized = Math.max(0, Math.min(1, (combined + 1.0) * 0.5));

        const [cr, cg, cb] = vibrantColorMap(normalized, time, warp);

        data[ptr]     = cr;
        data[ptr + 1] = cg;
        data[ptr + 2] = cb;
        data[ptr + 3] = 255;
        ptr += 4;
      }
    }

    offscreenCtx.putImageData(imgData, 0, 0);

    const mainCtx = canvasEl.getContext('2d');
    if (mainCtx) {
      mainCtx.imageSmoothingEnabled = true;
      mainCtx.imageSmoothingQuality = 'high';
      mainCtx.drawImage(offscreenCanvas, 0, 0, canvasEl.width, canvasEl.height);
    }

    animId = requestAnimationFrame(render);
  }

  function handlePointerMove(e) {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    targetMx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    targetMy = ((e.clientY - rect.top) / rect.height) * 2 - 1;
    isHovered = true;
  }

  function handlePointerLeave() {
    isHovered = false;
    targetMx = 0;
    targetMy = 0;
  }

  function handlePointerDown(e) {
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    ripples.push({
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
      radius: 0.04,
      maxRadius: 1.3,
      alpha: 0.75,
      speed: 0.035
    });
  }

  function handleResize() {
    if (!containerEl || !canvasEl) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = containerEl.getBoundingClientRect();
    const w = Math.max(10, Math.round(rect.width));
    const h = Math.max(10, Math.round(rect.height));

    canvasEl.width = w * dpr;
    canvasEl.height = h * dpr;
    canvasEl.style.width = `${w}px`;
    canvasEl.style.height = `${h}px`;
  }

  onMount(() => {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = BUFFER_W;
    offscreenCanvas.height = BUFFER_H;
    offscreenCtx = offscreenCanvas.getContext('2d');
    imgData = offscreenCtx.createImageData(BUFFER_W, BUFFER_H);
    dataBuffer = imgData.data;

    handleResize();
    resizeObserver = new ResizeObserver(() => handleResize());
    if (containerEl) resizeObserver.observe(containerEl);

    animId = requestAnimationFrame(render);
  });

  onDestroy(() => {
    if (animId) cancelAnimationFrame(animId);
    if (resizeObserver) resizeObserver.disconnect();
  });
</script>

<div
  class="color-field-container"
  bind:this={containerEl}
  style="height: {height};"
  on:pointermove={handlePointerMove}
  on:pointerleave={handlePointerLeave}
  on:pointerdown={handlePointerDown}
  role="region"
  aria-label="Vibrant procedural color view"
>
  <canvas bind:this={canvasEl} class="color-field-canvas"></canvas>

  <div class="field-meta">
    <div class="pattern-pill">
      <span class="pill-dot"></span>
      <span class="pill-text">{activePatternName}</span>
    </div>
    <span class="interactive-hint">INTERACTIVE · HOVER / CLICK</span>
  </div>
</div>

<style>
  .color-field-container {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 280px;
    border-radius: 4px;
    overflow: hidden;
    background: #E8D5C4;
    cursor: crosshair;
    user-select: none;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }

  .color-field-canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .field-meta {
    position: absolute;
    bottom: 10px;
    left: 10px;
    right: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    pointer-events: none;
    font-family: 'JetBrains Mono', monospace;
  }

  .pattern-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 255, 255, 0.82);
    backdrop-filter: blur(8px);
    padding: 3px 8px;
    border-radius: 3px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  }

  .pill-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #E85D4A;
    box-shadow: 0 0 5px rgba(232, 93, 74, 0.6);
  }

  .pill-text {
    font-size: 8px;
    color: #222;
    letter-spacing: 0.12em;
    font-weight: 700;
  }

  .interactive-hint {
    font-size: 7.5px;
    color: rgba(0, 0, 0, 0.5);
    background: rgba(255, 255, 255, 0.7);
    padding: 2px 6px;
    border-radius: 2px;
    letter-spacing: 0.1em;
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .interactive-hint {
      display: none;
    }
    .color-field-container {
      min-height: 220px;
    }
  }
</style>
