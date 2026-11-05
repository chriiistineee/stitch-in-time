<script lang="ts">
  // Figma: the dog head (91 x 97) peeks over Button/primary from behind,
  // and the paw (43 x 67) hangs over its top edge in front.
  import type { Snippet } from 'svelte';
  let { onclick, disabled = false, wide = false, children }: { onclick: () => void; disabled?: boolean; wide?: boolean; children: Snippet } = $props();
</script>

<div class="peek" class:wide>
  <img class="dog" src="/img/dog-peek.png" alt="" draggable="false" />
  <button class="primary" {onclick} {disabled}>{@render children()}</button>
  {#if wide}
    <!-- Figma "choose a task": the paw is rotated -38.09 deg inside a 69.2 x 75.5 box. -->
    <div class="paw-wrap"><img class="paw-rot" src="/img/paw-dangle.png" alt="" draggable="false" /></div>
  {:else}
    <img class="paw" src="/img/paw-dangle.png" alt="" draggable="false" />
  {/if}
</div>

<style>
  .peek {
    position: relative;
    width: 100%;
    flex: none;
  }
  .dog {
    position: absolute;
    width: 91px;
    height: 97px;
    left: calc(50% - 40px);
    top: -91px;
    object-fit: cover;
    pointer-events: none;
  }
  .primary {
    position: relative;
    width: 100%;
  }
  .paw {
    position: absolute;
    width: 43px;
    height: 67px;
    left: calc(50% + 26px);
    top: 0;
    object-fit: cover;
    filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.28));
    pointer-events: none;
  }
  /* Figma "choose a task" layout, relative to the button (312 wide):
     dog at (115, -97), paw box at (188, -20).
     Stitch and the label stay centered. The paw sits a little further out and
     turns a little more, so it does not cover the larger label. */
  .wide {
    --shift: 0px;
  }

  .wide .dog {
    left: calc(50% - 41px + var(--shift));
    top: -97px;
  }
  .paw-wrap {
    position: absolute;
    left: calc(50% + 32px + var(--shift));
    top: -20px;
    width: 69.18px;
    height: 75.47px;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .paw-rot {
    flex: none;
    width: 33.02px;
    height: 70.01px;
    object-fit: cover;
    transform: rotate(-38.09deg);
    filter: drop-shadow(0 3px 5px rgba(0, 0, 0, 0.28));
  }
</style>
