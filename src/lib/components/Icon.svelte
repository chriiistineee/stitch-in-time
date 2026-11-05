<script lang="ts">
  // Figma icons are drawn with a CSS mask, so they take the text color (white).
  // Icons that Figma does not have yet (pencil, trash, grip, minus) are inline SVG.
  type FigmaName = 'todo' | 'timer' | 'minimize' | 'x' | 'play' | 'pause' | 'reset' | 'skip' | 'plus' | 'check';
  type ExtraName = 'pencil' | 'trash' | 'grip' | 'minus';
  let { name, size = 18 }: { name: FigmaName | ExtraName; size?: number } = $props();

  const files: Record<FigmaName, (s: number) => string> = {
    todo: (s) => (s <= 16 ? 'todo-16' : 'todo-18'),
    timer: () => 'timer',
    minimize: () => 'minimize',
    x: () => 'x',
    play: (s) => (s <= 14 ? 'play-14' : 'play-20'),
    pause: () => 'pause',
    reset: () => 'reset',
    skip: () => 'skip',
    plus: () => 'plus',
    check: () => 'check',
  };
  let file = $derived(name in files ? files[name as FigmaName](size) : null);
</script>

{#if file}
  <span class="ico" aria-hidden="true" style="width:{size}px;height:{size}px;--src:url(/icons/{file}.svg)"></span>
{:else}
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    {#if name === 'pencil'}
      <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" />
    {:else if name === 'trash'}
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />
    {:else if name === 'grip'}
      <g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" /></g>
    {:else if name === 'minus'}
      <path d="M5 12h14" />
    {/if}
  </svg>
{/if}

<style>
  .ico {
    display: inline-block;
    flex: none;
    background-color: currentColor;
    -webkit-mask: var(--src) center / contain no-repeat;
    mask: var(--src) center / contain no-repeat;
  }
  svg {
    flex: none;
  }
</style>
