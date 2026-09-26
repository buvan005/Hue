<script>
  import { createEventDispatcher } from 'svelte';
  import { fade, crossfade } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';
  import StartScreen from './StartScreen.svelte';
  import ColorStage from './ColorStage.svelte';
  import Sliders from './Sliders.svelte';
  import ResultView from './ResultView.svelte';
  import EndModal from './EndModal.svelte';

  export let phase         = 'start';
  export let round         = 1;
  export let total         = 5;
  export let target        = null;
  export let guessHSB      = { h: 180, s: 50, b: 50 };
  export let currentResult = null;
  export let rounds        = [];
  export let totalScore    = 0;
  export let bestScore     = 0;
  export let isNewBest     = false;

  const dispatch = createEventDispatcher();

  // Crossfade for smooth phase transitions — shared send/receive
  const [send, receive] = crossfade({
    duration: 400,
    easing: cubicInOut,
    fallback(node) {
      return {
        duration: 350,
        easing: cubicInOut,
        css: t => `opacity: ${t}; transform: scale(${0.97 + t * 0.03})`
      };
    }
  });
</script>

<div class="gc">
  {#if phase === 'start'}
    <div in:fade={{ duration: 300, easing: cubicInOut }}>
      <StartScreen
        {bestScore}
        on:play
        on:daily
      />
    </div>

  {:else if phase === 'memorize' && target}
    <div
      in:receive={{ key: 'phase' }}
      out:send={{ key: 'phase' }}
    >
      <ColorStage {target} {round} {total} on:done={() => dispatch('memorizeDone')} />
    </div>

  {:else if phase === 'guess' && target}
    <div
      in:receive={{ key: 'phase' }}
      out:send={{ key: 'phase' }}
    >
      <Sliders
        {round} {total}
        initial={guessHSB}
        {rounds} {totalScore} {bestScore}
        on:submit
      />
    </div>

  {:else if phase === 'result' && currentResult}
    <div
      in:receive={{ key: 'phase' }}
      out:send={{ key: 'phase' }}
    >
      <ResultView result={currentResult} {round} {total} {rounds} {totalScore} on:next />
    </div>

  {:else if phase === 'end'}
    <div in:fade={{ duration: 450, easing: cubicInOut }}>
      <EndModal
        {rounds}
        {totalScore}
        {total}
        {isNewBest}
        on:retry
        on:playAgain
        on:home
      />
    </div>
  {/if}
</div>

<style>
  .gc {
    width: 100%;
    /* Prevent layout jumps during crossfade by using a grid stack */
    display: grid;
  }
  .gc > :global(div) {
    grid-area: 1 / 1;
  }
</style>
