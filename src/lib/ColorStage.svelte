<script>
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import { hsbToRgb, hsbHex, luma } from '../engine/color.js';

  export let target = null;
  export let round  = 1;
  export let total  = 5;

  const dispatch = createEventDispatcher();
  const MEM_MS = 5000;  // 5 seconds to memorize
  const GO_AT  = 3500;

  let showGo    = false;
  let countdown = Math.ceil(MEM_MS / 1000);
  let hex       = '';
  let progress  = 1;
  let runId     = '';
  let isDark    = true;
  let goTimeout, doneTimeout, intervalId, animationFrameId;

  function clearTimers() {
    clearTimeout(goTimeout); clearTimeout(doneTimeout);
    clearInterval(intervalId); cancelAnimationFrame(animationFrameId);
  }

  function startSequence() {
    if (!target) return;
    clearTimers();
    hex       = hsbHex(target.h, target.s, target.b);
    const rgb = hsbToRgb(target.h, target.s, target.b);
    isDark    = luma(rgb.r, rgb.g, rgb.b) < 145;
    showGo    = false;
    countdown = Math.ceil(MEM_MS / 1000);
    progress  = 1;

    const startedAt = performance.now();
    const tick = (now) => {
      const elapsed = now - startedAt;
      progress = Math.max(0, 1 - elapsed / (MEM_MS - 100));
      if (elapsed < MEM_MS - 100) animationFrameId = requestAnimationFrame(tick);
    };
    animationFrameId = requestAnimationFrame(tick);

    intervalId  = setInterval(() => {
      countdown = Math.max(0, Math.ceil((MEM_MS - (performance.now() - startedAt)) / 1000));
    }, 100);
    goTimeout   = setTimeout(() => { showGo = true; }, GO_AT);
    doneTimeout = setTimeout(() => { clearTimers(); dispatch('done'); }, MEM_MS);
  }

  $: currentRunId = target ? `${target.h}-${target.s}-${target.b}-${round}` : '';
  $: if (currentRunId && currentRunId !== runId) { runId = currentRunId; startSequence(); }

  onDestroy(() => clearTimers());

  $: overlayColor = isDark ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
</script>

<div class="memorize-screen">
  <!-- Color swatch — full centered display -->
  <div class="mem-swatch" style="background-color: {hex};">
    <!-- Round pips on top -->
    <div class="round-bar">
      {#each Array(total) as _, i}
        <div class="round-pip"
          class:active={i === round - 1}
          class:done={i < round - 1}
          style="background: {i === round - 1
            ? (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)')
            : i < round - 1
              ? (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)')
              : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)')
          };"
        ></div>
      {/each}
    </div>

    <!-- Center content -->
    <div class="mem-center">
      <div class="mem-countdown"
        style="color: {overlayColor}0.12);"
      >{countdown}</div>
      {#if showGo}
        <div in:fade={{ duration: 300 }} class="mem-go-label"
          style="color: {overlayColor}0.35);"
        >REMEMBER THIS</div>
      {/if}
    </div>

    <!-- Bottom info -->
    <div class="mem-bottom">
      <span class="mem-label"
        style="color: {overlayColor}0.45);">MEMORIZE</span>
      <span class="mem-round"
        style="color: {overlayColor}0.35);">{round} / {total}</span>
    </div>
  </div>

  <!-- Progress bar -->
  <div class="progress-wrap">
    <div class="progress-fill" style="width:{progress * 100}%;"></div>
  </div>
</div>

<style>
  .memorize-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    min-height: 480px;
  }

  .mem-swatch {
    width: 100%;
    max-width: 680px;
    min-height: 380px;
    border-radius: 8px;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border: 1px solid rgba(0,0,0,0.06);
    transition: background-color 0.15s ease;
    overflow: hidden;
  }

  .round-bar {
    position: absolute;
    top: 14px;
    left: 16px;
    right: 16px;
    display: flex;
    gap: 6px;
  }

  .round-pip {
    height: 3px;
    flex: 1;
    border-radius: 2px;
    transition: background 0.3s;
  }

  .mem-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .mem-countdown {
    font-size: clamp(80px, 16vw, 140px);
    font-weight: 700;
    line-height: 1;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: -0.05em;
    user-select: none;
  }

  .mem-go-label {
    font-size: 11px;
    letter-spacing: 0.25em;
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
  }

  .mem-bottom {
    position: absolute;
    bottom: 14px;
    left: 16px;
    right: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mem-label {
    font-size: 9px;
    letter-spacing: 0.2em;
    font-family: 'JetBrains Mono', monospace;
  }

  .mem-round {
    font-size: 10px;
    letter-spacing: 0.08em;
    font-family: 'JetBrains Mono', monospace;
  }

  .progress-wrap {
    width: 100%;
    max-width: 680px;
    height: 3px;
    background: #C8C3B4;
    overflow: hidden;
    margin-top: 0;
  }

  .progress-fill {
    height: 3px;
    background: #1a1a1a;
    transition: width 0.1s linear;
  }
</style>
