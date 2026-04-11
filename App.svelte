<script>
  import { onMount } from 'svelte';
  import GameCard from './GameCard.svelte';
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
  <!-- Header -->
  <header class="w-full max-w-[520px] flex items-center justify-between pt-6 pb-4">
    <div class="text-[17px] font-semibold tracking-[-0.04em] text-[#111]">Dialed.</div>
    <div class="text-[11px] text-[#bbb] font-normal">
      Best: <span class="text-[#999] font-medium">{state.bestScore > 0 ? state.bestScore.toFixed(2) : '—'}</span>
    </div>
  </header>

  <!-- Game Card -->
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

  <!-- Footer -->
  <footer class="w-full max-w-[520px] flex items-center justify-between pt-3 pb-6 text-[10.5px] text-[#ccc]">
    <div class="flex gap-3 items-center">
      <span>Color v1.4</span>
      <a href="#" class="text-[#ccc] hover:text-[#999] transition-colors">Privacy</a>
      <a href="#" class="text-[#ccc] hover:text-[#999] transition-colors">Scoring</a>
    </div>
    <div class="flex gap-2 items-center">
      <button class="w-7 h-7 flex items-center justify-center text-[#ccc] hover:text-[#888] transition-colors rounded-full hover:bg-black/5" aria-label="Sound">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      </button>
    </div>
  </footer>
</div>
