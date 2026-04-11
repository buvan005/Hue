<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { fade } from 'svelte/transition';
  import ScoreDisplay from './ScoreDisplay.svelte';

  export let result = null;
  export let round = 1;
  export let total = 5;

  const dispatch = createEventDispatcher();

  let msgVisible = false;
  let revealTimeout;
  let revealKey = '';

  // ─── Adaptive contrast: guess half ────────────────────────────────────────
  $: gDark = result ? result.guess.luma < 145 : false;
  $: tDark = result ? result.target.luma < 145 : false;
  $: gTextColor = gDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
  $: gScoreColor = gDark ? '#fff' : '#111';
  $: tTextColor = tDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
  $: arrowBg = tDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.82)';
  $: arrowColor = tDark ? '#111' : '#fff';

  // ─── Delayed message reveal ───────────────────────────────────────────────
  $: currentRevealKey = result ? `${result.target.hex}-${result.guess.hex}-${result.score}` : '';
  $: if (currentRevealKey && currentRevealKey !== revealKey) {
    revealKey = currentRevealKey;
    msgVisible = false;
    clearTimeout(revealTimeout);
    revealTimeout = setTimeout(() => {
      msgVisible = true;
    }, 700);
  }

  onDestroy(() => {
    clearTimeout(revealTimeout);
  });
</script>

<div style="height: 390px; display: flex; flex-direction: column;">
  <!-- Guess half (top) -->
  <div class="flex-1 relative flex items-start p-5 transition-colors duration-75" style="background-color: {result?.guess.hex || '#aaa'};">
    <div class="flex flex-col gap-0.5">
      <span class="text-[10px] font-semibold tracking-[0.12em] uppercase" style="color: {gTextColor};">Your guess</span>
      <span class="text-[11px] font-medium" style="color: {gTextColor};">
        H{result?.guess.h} S{result?.guess.s} B{result?.guess.b}
      </span>
    </div>

    <div class="absolute right-5 top-1/2 -translate-y-1/2 text-right pointer-events-none">
      {#if result}
        <ScoreDisplay
          value={result.score}
          decimals={2}
          duration={920}
          delay={200}
          color={gScoreColor}
          size="clamp(56px, 15vw, 80px)"
        />
        {#if msgVisible}
          <div
            in:fade={{ duration: 320 }}
            class="text-[12px] font-medium mt-1.5 max-w-[200px] leading-snug"
            style="color: {gDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.38)'};"
          >
            {result.msg}
          </div>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Gradient divider -->
  <div class="h-[2px] flex-shrink-0 relative z-10">
    <div
      class="absolute inset-0"
      style="background: linear-gradient(to right, {result?.guess.hex || '#aaa'} 0%, {result?.target.hex || '#888'} 100%);"
    ></div>
  </div>

  <!-- Target half (bottom) -->
  <div class="flex-1 relative flex items-start p-5 transition-colors duration-75" style="background-color: {result?.target.hex || '#888'};">
    <div class="flex flex-col gap-0.5">
      <span class="text-[10px] font-semibold tracking-[0.12em] uppercase" style="color: {tTextColor};">Target</span>
      <span class="text-[11px] font-medium" style="color: {tTextColor};">
        H{result?.target.h} S{result?.target.s} B{result?.target.b}
      </span>
    </div>

    <div
      class="absolute top-5 right-5 text-[10px] font-semibold tracking-[0.04em] px-2.5 py-1 rounded-full"
      style="background: {tDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)'}; color: {tTextColor};"
    >
      ΔE {result?.dE}
    </div>

    <button
      on:click={() => dispatch('next')}
      aria-label={round >= total ? 'See results' : 'Next round'}
      class="absolute bottom-4 right-4 w-[50px] h-[50px] rounded-full flex items-center justify-center cursor-pointer border-none transition-all duration-150 hover:scale-110 active:scale-95"
      style="background: {arrowBg}; box-shadow: 0 4px 18px rgba(0,0,0,0.2);"
    >
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke={arrowColor} stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </button>

    <div class="absolute bottom-[20px] left-5 text-[10px] font-semibold tracking-[0.1em] uppercase" style="color: {tTextColor};">
      {round < total ? `${total - round} round${total - round !== 1 ? 's' : ''} left` : 'final round'}
    </div>
  </div>
</div>
