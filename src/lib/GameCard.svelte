<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import ColorStage from './ColorStage.svelte';
  import Sliders from './Sliders.svelte';
  import ResultView from './ResultView.svelte';
  import EndModal from './EndModal.svelte';

  export let phase = 'memorize';
  export let round = 1;
  export let total = 5;
  export let target = null;
  export let guessHSB = { h: 180, s: 50, b: 50 };
  export let currentResult = null;
  export let rounds = [];
  export let totalScore = 0;
  export let isNewBest = false;

  const dispatch = createEventDispatcher();
</script>

<div
  class="w-full max-w-[520px] bg-white rounded-[22px] overflow-hidden"
  style="box-shadow: 0 28px 72px rgba(0,0,0,0.10), 0 4px 18px rgba(0,0,0,0.06);"
  in:scale={{ duration: 380, start: 0.96, easing: cubicOut }}
>
  {#if phase === 'memorize' && target}
    <div in:fade={{ duration: 180 }} out:fade={{ duration: 120 }}>
      <ColorStage
        {target}
        {round}
        {total}
        on:done={() => dispatch('memorizeDone')}
      />
    </div>
  {:else if phase === 'guess' && target}
    <div in:fade={{ duration: 200 }} out:fade={{ duration: 120 }}>
      <Sliders
        {round}
        {total}
        initial={guessHSB}
        on:submit
      />
    </div>
  {:else if phase === 'result' && currentResult}
    <div in:fly={{ y: 16, duration: 280, easing: cubicOut }} out:fade={{ duration: 120 }}>
      <ResultView
        result={currentResult}
        {round}
        {total}
        on:next
      />
    </div>
  {:else if phase === 'end'}
    <div in:fade={{ duration: 240 }}>
      <EndModal
        {rounds}
        {totalScore}
        {total}
        {isNewBest}
        on:playAgain
      />
    </div>
  {/if}
</div>
