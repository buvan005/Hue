<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ScoreDisplay from './ScoreDisplay.svelte';
  import { endTagline, rankLabel } from '../engine/scoring.js';

  export let rounds = [];
  export let totalScore = 0;
  export let total = 5;
  export let isNewBest = false;

  const dispatch = createEventDispatcher();

  let stripVisible = false;
  let rank = '';

  onMount(() => {
    rank = rankLabel(totalScore, total * 10);
    const timeoutId = setTimeout(() => {
      stripVisible = true;
    }, 600);

    return () => clearTimeout(timeoutId);
  });

  function handleShare() {
    const text = `I scored ${totalScore.toFixed(2)}/${total * 10} on HUE. Can you beat me?`;

    if (navigator.share) {
      navigator.share({ title: 'HUE', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }
</script>

<div class="bg-[#0d0d0d] text-white rounded-[24px] overflow-hidden">
  <div class="p-7 flex flex-col" style="min-height: 380px;">
    <div class="flex items-center justify-between mb-2">
      <span class="text-[11px] font-semibold text-[#e8b84b] tracking-[-0.01em]">{rank}</span>
      {#if isNewBest}
        <span
          in:fade={{ duration: 400 }}
          class="text-[10px] font-semibold tracking-[0.08em] uppercase text-[#e8b84b] px-2.5 py-1 rounded-full bg-[#e8b84b]/10"
        >
          * New best
        </span>
      {/if}
    </div>

    <div class="flex items-baseline gap-2 mb-1">
      <ScoreDisplay
        value={totalScore}
        decimals={2}
        duration={1200}
        delay={100}
        color="#fff"
        size="clamp(58px, 16vw, 84px)"
      />
      <span class="text-[28px] font-black tracking-[-0.04em] text-[#2a2a2a]">/{total * 10}</span>
    </div>

    <p class="text-[12.5px] text-[#4a4a4a] font-normal mb-6 leading-snug">
      {endTagline(totalScore / total)}
    </p>

    {#if stripVisible}
      <div
        in:fly={{ y: 10, duration: 350, easing: cubicOut }}
        class="flex gap-1.5 mb-6"
        style="height: 72px;"
      >
        {#each rounds as result, index}
          <div
            class="flex-1 rounded-xl overflow-hidden relative"
            in:fly={{ y: 8, duration: 300, delay: index * 60, easing: cubicOut }}
          >
            <div class="absolute inset-0" style="background: {result.guess.hex};"></div>
            <div
              class="absolute inset-0"
              style="background: {result.target.hex}; clip-path: polygon(0 100%, 100% 0, 100% 100%);"
            ></div>
            <div
              class="absolute top-1.5 left-2 text-[10.5px] font-bold leading-none"
              style="color: rgba(255,255,255,0.85); text-shadow: 0 1px 4px rgba(0,0,0,0.4);"
            >
              {result.score.toFixed(1)}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="flex gap-1.5 mb-6" style="height: 72px;">
        {#each Array(total) as _}
          <div class="flex-1 rounded-xl bg-white/5 animate-pulse"></div>
        {/each}
      </div>
    {/if}

    <div class="flex gap-2 mt-auto">
      <button
        on:click={() => dispatch('playAgain')}
        class="px-5 py-3 rounded-full border border-white/15 bg-transparent text-white/80 text-[12.5px] font-medium cursor-pointer transition-all duration-150 hover:border-white/30 hover:bg-white/5 hover:scale-[1.02] active:scale-[0.97] whitespace-nowrap"
      >
        Play Again
      </button>
      <button
        on:click={handleShare}
        class="flex-1 py-3 rounded-full bg-white text-[#111] text-[12.5px] font-semibold cursor-pointer transition-all duration-150 hover:opacity-90 hover:scale-[1.02] active:scale-[0.97] active:opacity-80"
      >
        Challenge a friend ->
      </button>
    </div>

    <button
      on:click={() => dispatch('playAgain')}
      class="mt-2.5 py-3 rounded-full border border-white/[0.07] bg-transparent text-white/25 text-[11px] font-normal cursor-pointer transition-all duration-150 hover:text-white/50 hover:border-white/18 w-full tracking-[0.02em]"
    >
      Daily Challenge
    </button>
  </div>
</div>


