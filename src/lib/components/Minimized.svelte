<script lang="ts">
  // Click to expand. Drag anywhere to move. It always snaps to the nearest screen corner.
  // Figma PiP / Minimized: pill 190 x 86, radius 43, Stitch sticks out top-left.
  import { app } from '$lib/app.svelte';
  import { dragWindow, snapToCorner } from '$lib/windowDrag';
  import { inTauri } from '$lib/db';
  import { formatMs } from '$lib/timer';

  function down(e: PointerEvent) {
    dragWindow(e, () => app.expand(), snapToCorner);
  }

  // Snap when it minimizes, and when it changes between the dog and the pill.
  // The wait lets the window take its new size first.
  $effect(() => {
    void app.active;
    if (!inTauri) return;
    const t = setTimeout(snapToCorner, 120);
    return () => clearTimeout(t);
  });
  function key(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') app.expand();
  }
  let label = $derived(
    app.timer.status === 'paused' ? 'PAUSED' : app.timer.mode === 'focus' ? 'WORK' : 'BREAK',
  );
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div class="mini" role="button" tabindex="0" aria-label="Expand Stitch in Time"
  onpointerdown={down} onkeydown={key}>
  {#if app.active}
    <div class="pill">
      <div class="dog-slot">
        <div class="dog">
          <img src={app.focusRunning ? '/img/dog-pill.png' : '/img/dog-neutral.png'} class:neutral={!app.focusRunning}
            alt="Stitch" draggable="false" />
        </div>
      </div>
      <div class="txt">
        <div class="lbl">{label}</div>
        <div class="time">{formatMs(app.remaining)}</div>
      </div>
    </div>
  {:else}
    <img class="solo" src="/img/dog-neutral.png" alt="Stitch" draggable="false" />
  {/if}
</div>

<style>
  .mini {
    position: fixed;
    inset: 0;
    cursor: grab;
    outline: none;
    touch-action: none;
  }
  /* The window is 226 x 116 (before zoom). The pill is its bottom-right 190 x 86. */
  .pill {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 190px;
    height: 86px;
    border-radius: 43px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px 0 10px;
    pointer-events: none;
    /* Fully clear: no glass, no fill, no border. */
  }
  .dog-slot {
    position: relative;
    /* A little narrower than the Figma 76 px. */
    width: 68px;
    height: 76px;
    flex: none;
  }
  .dog {
    position: absolute;
    left: -24px;
    top: -24px;
    width: 100px;
    height: 100px;
  }
  .dog img {
    position: absolute;
    left: -4.79%;
    top: -3.23%;
    width: 114.16%;
    height: 129.03%;
    max-width: none;
  }
  .dog img.neutral {
    left: 2%;
    top: 4%;
    width: 96%;
    height: auto;
  }
  /* White letters with a soft dark glow around each one, so they read on any background. */
  .txt {
    color: #fff;
    text-shadow: none;
    filter: drop-shadow(0 1px 1.5px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 6px rgba(0, 0, 0, 0.35));
  }
  .lbl {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.6px;
  }
  .time {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    font-variant-numeric: tabular-nums;
  }
  /* Figma Minimized idle: neutral dog 92 x 92, no background */
  .solo {
    position: absolute;
    inset: 0;
    width: 92px;
    height: 92px;
    object-fit: contain;
    pointer-events: none;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  }
</style>
