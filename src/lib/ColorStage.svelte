<script>
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import { hsbToRgb, hsbHex, luma } from '../engine/color.js';

  export let target = null;
  export let round = 1;
  export let total = 5;

  const dispatch = createEventDispatcher();

  const MEM_MS = 2400;
  const GO_AT  = 1500;

  let showGo    = false;
  let countdown = Math.ceil(MEM_MS / 1000);
  let hex       = '';
  let progress  = 1;
  let runId     = '';

  let goTimeout;
  let doneTimeout;
  let intervalId;
  let animationFrameId;

  function clearTimers() {
    clearTimeout(goTimeout);
    clearTimeout(doneTimeout);
    clearInterval(intervalId);
    cancelAnimationFrame(animationFrameId);
  }

  function startSequence() {
    if (!target) return;
    clearTimers();

    hex      = hsbHex(target.h, target.s, target.b);
    showGo   = false;
    countdown = Math.ceil(MEM_MS / 1000);
    progress  = 1;

    const startedAt = performance.now();
    const tick = (now) => {
      const elapsed = now - startedAt;
      progress = Math.max(0, 1 - elapsed / (MEM_MS - 100));
      if (elapsed < MEM_MS - 100) animationFrameId = requestAnimationFrame(tick);
    };
    animationFrameId = requestAnimationFrame(tick);

    intervalId = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      countdown = Math.max(0, Math.ceil((MEM_MS - elapsed) / 1000));
    }, 100);

    goTimeout   = setTimeout(() => { showGo = true; }, GO_AT);
    doneTimeout = setTimeout(() => { clearTimers(); dispatch('done'); }, MEM_MS);
  }

  $: currentRunId = target ? `${target.h}-${target.s}-${target.b}-${round}` : '';
  $: if (currentRunId && currentRunId !== runId) {
    runId = currentRunId;
    startSequence();
  }

  onDestroy(() => clearTimers());
</script>

<!-- Color swatch -->
<div class="mem-swatch" style="background-color: {hex};">
  <!-- Large decorative countdown (bottom-right) -->
  <div class="mem-counter" aria-hidden="true">{countdown}</div>

  <!-- Large decorative GO (bottom-left, fades in at GO_AT) -->
  {#if showGo}
    <div in:fade={{ duration: 300 }} class="mem-go" aria-hidden="true">GO</div>
  {/if}

  <!-- HSB pill (center bottom) -->
  <span class="mem-hsb">H{target?.h} · S{target?.s} · B{target?.b}</span>

  <!-- Bottom meta row -->
  <div class="mem-meta">
    <span class="mem-round">{round} / {total}</span>
    <span class="mem-phase">MEMORIZE</span>
  </div>
</div>

<!-- Slim progress bar below swatch -->
<div class="progress-bar-wrap">
  <div class="progress-bar-fill" style="width: {progress * 100}%;"></div>
</div>

<style>
  /* ── Swatch ── */
  .mem-swatch {
    border-radius: 6px;
    height: 220px;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 14px;
    transition: background-color 0.08s ease;
  }

  /* ── Large decorative numbers ── */
  .mem-counter,
  .mem-go {
    position: absolute;
    bottom: 10px;
    font-size: clamp(56px, 16vw, 80px);
    font-weight: 700;
    line-height: 1;
    pointer-events: none;
    user-select: none;
    font-family: 'JetBrains Mono', monospace;
  }

  .mem-counter {
    right: 14px;
    color: rgba(255, 255, 255, 0.20);
  }

  .mem-go {
    left: 14px;
    color: rgba(255, 255, 255, 0.25);
  }

  /* ── Center HSB pill ── */
  .mem-hsb {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 9px;
    letter-spacing: 0.10em;
    color: rgba(255, 255, 255, 0.55);
    background: rgba(0, 0, 0, 0.18);
    padding: 3px 8px;
    border-radius: 3px;
    white-space: nowrap;
    font-family: 'JetBrains Mono', monospace;
    z-index: 3;
  }

  /* ── Bottom meta row ── */
  .mem-meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    position: relative;
    z-index: 2;
  }

  .mem-round {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.70);
    font-family: 'JetBrains Mono', monospace;
  }

  .mem-phase {
    font-size: 9px;
    letter-spacing: 0.18em;
    color: rgba(255, 255, 255, 0.55);
    font-family: 'JetBrains Mono', monospace;
  }

  /* ── Progress bar ── */
  .progress-bar-wrap {
    height: 3px;
    background: #ddd;
    margin-top: 10px;
    overflow: hidden;
  }

  .progress-bar-fill {
    height: 3px;
    background: #1a1a1a;
    transition: width 0.1s linear;
  }
</style>
