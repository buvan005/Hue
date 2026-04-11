<script>
  import { onMount } from 'svelte';
  import GameCard from './lib/GameCard.svelte';
  import { gameStore } from './stores/gameStore.js';

  let state = {
    phase: 'memorize',
    round: 0,
    total: 5,
    target: null,
    guessHSB: { h: 180, s: 50, b: 50 },
    currentResult: null,
    rounds: [],
    totalScore: 0,
    bestScore: 0,
    isNewBest: false
  };

  onMount(() => {
    const unsubscribe = gameStore.subscribe((value) => {
      state = value;
    });

    gameStore.init();
    return unsubscribe;
  });
</script>

<div class="min-h-screen bg-[#f0efed] flex flex-col items-center px-4 py-0 font-['DM_Sans',_sans-serif]">
  <header class="w-full max-w-[520px] flex items-center justify-between pt-6 pb-3">
    <div class="text-[19px] font-extrabold tracking-[-0.06em] text-[#111] uppercase">HUE</div>
    <div class="text-[10.5px] text-[#bbb] font-normal tracking-[0.02em]">
      Best: <span class="text-[#999] font-semibold tabular-nums">{state.bestScore > 0 ? state.bestScore.toFixed(2) : '—'}</span>
    </div>
  </header>

  <GameCard
    phase={state.phase}
    round={state.round}
    total={state.total}
    target={state.target}
    guessHSB={state.guessHSB}
    currentResult={state.currentResult}
    rounds={state.rounds}
    totalScore={state.totalScore}
    isNewBest={state.isNewBest}
    on:memorizeDone={() => gameStore.finishMemorize()}
    on:submit={(event) => gameStore.submitGuess(event.detail)}
    on:next={() => gameStore.nextRound()}
    on:playAgain={() => gameStore.restart()}
  />

  <footer class="w-full max-w-[520px] flex items-center justify-between pt-3 pb-5 text-[10px] text-[#c5c5c5]">
    <div class="flex gap-3 items-center">
      <span class="tracking-[0.04em]">HUE v1.0</span>
      <span class="text-[#ddd]">·</span>
      <span class="tracking-[0.02em]">Color Memory Game</span>
    </div>
    <div class="flex gap-1 items-center">
      <button class="w-7 h-7 flex items-center justify-center text-[#c5c5c5] hover:text-[#888] transition-colors rounded-full hover:bg-black/[0.04]" aria-label="Sound">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      </button>
    </div>
  </footer>
</div>
