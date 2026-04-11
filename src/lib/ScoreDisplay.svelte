<script>
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';

  export let value = 0;
  export let decimals = 2;
  export let duration = 900;
  export let delay = 160;
  export let color = '#111';
  export let size = '76px';

  const displayed = tweened(0, { duration, easing: cubicOut });

  onMount(() => {
    setTimeout(() => displayed.set(value), delay);
  });

  $: formatted = $displayed.toFixed(decimals);
</script>

<div
  class="font-black leading-none tracking-[-0.055em] select-none tabular-nums"
  style="font-size: {size}; color: {color};"
>
  {formatted}
</div>
