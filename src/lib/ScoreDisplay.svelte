<script>
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  export let value    = 0;
  export let decimals = 2;
  export let duration = 900;
  export let delay    = 160;
  export let color    = '#1a1a1a';
  export let size     = '38px';

  const displayed = tweened(0, { duration, easing: cubicOut });

  onMount(() => {
    const t = setTimeout(() => displayed.set(value), delay);
    return () => clearTimeout(t);
  });

  $: formatted = $displayed.toFixed(decimals);
</script>

<span
  class="score-num"
  style="font-size: {size}; color: {color};"
>
  {formatted}
</span>

<style>
  .score-num {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.04em;
    font-variant-numeric: tabular-nums;
    user-select: none;
  }
</style>
