<script>
  import { onDestroy, createEventDispatcher } from 'svelte';
  import { fade } from 'svelte/transition';
  import { hsbToRgb, hsbHex, luma } from './engine/color.js';

  export let target = null;
  export let round = 1;
  export let total = 5;

  const dispatch = createEventDispatcher();
  const MEM_MS = 2400;
  const GO_AT = 1500;

  let showGo = false;
  let countdown = Math.ceil(MEM_MS / 1000);
  let hex = '';
  let isDark = false;
  let progress = 1;
  let runId = '';

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
    hex = hsbHex(target.h, target.s, target.b);

    const rgb = hsbToRgb(target.h, target.s, target.b);
    isDark = luma(rgb.r, rgb.g, rgb.b) < 145;
    showGo = false;
    countdown = Math.ceil(MEM_MS / 1000);
    progress = 1;

    const startedAt = performance.now();
    const tick = (now) => {
      const elapsed = now - startedAt;
      progress = Math.max(0, 1 - elapsed / (MEM_MS - 100));

      if (elapsed < MEM_MS - 100) {
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);

    intervalId = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      countdown = Math.max(0, Math.ceil((MEM_MS - elapsed) / 1000));
    }, 100);

    goTimeout = setTimeout(() => {
      showGo = true;
    }, GO_AT);

    doneTimeout = setTimeout(() => {
      clearTimers();
      dispatch('done');
    }, MEM_MS);
  }

  $: currentRunId = target ? `${target.h}-${target.s}-${target.b}-${round}` : '';
  $: if (currentRunId && currentRunId !== runId) {
    runId = currentRunId;
    startSequence();
  }

  onDestroy(() => {
    clearTimers();
  });
</script>

<div class="relative overflow-hidden" style="height: 390px; background-color: {hex};">
  <div
    class="absolute top-4 left-5 text-[11px] font-medium tracking-[0.06em] uppercase"
    style="color: {isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.25)'};"
  >
    {round} / {total}
  </div>

  <div
    class="absolute top-4 right-5 text-[10px] font-medium tracking-[0.12em] uppercase"
    style="color: {isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.18)'};"
  >
    memorize
  </div>

  <div
    class="absolute bottom-10 right-8 font-black tracking-[-0.08em] leading-none select-none pointer-events-none transition-all duration-300"
    style="font-size: clamp(64px, 18vw, 100px); color: {isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'};"
  >
    {countdown}
  </div>

  {#if showGo}
    <div
      in:fade={{ duration: 300 }}
      class="absolute bottom-9 left-7 font-black tracking-[-0.07em] leading-none select-none pointer-events-none uppercase"
      style="font-size: clamp(54px, 14vw, 82px); color: {isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)'};"
    >
      go
    </div>
  {/if}

  <div
    class="absolute bottom-5 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.04em] font-medium px-3 py-1 rounded-full"
    style="background: {isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'}; color: {isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.22)'};"
  >
    H{target?.h} S{target?.s} B{target?.b}
  </div>

  <div class="absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden" style="background: {isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'};">
    <div
      class="h-full origin-left"
      style="transform: scaleX({progress}); background: {isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'}; transition: transform 0.1s linear;"
    ></div>
  </div>
</div>
