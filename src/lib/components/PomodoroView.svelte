<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { formatMs, progress, sessionNumber, CYCLE, type Mode } from '$lib/timer';
  import Icon from './Icon.svelte';
  import PeekButton from './PeekButton.svelte';

  const modes: { id: Mode; label: string }[] = [
    { id: 'focus', label: 'Focus' },
    { id: 'short', label: 'Short break' },
    { id: 'long', label: 'Long break' },
  ];

  // Figma Timer Ring: 224 px, track 14 px wide, disc 182 px.
  const R = 105;
  const C = 2 * Math.PI * R;
  let frac = $derived(progress(app.timer, app.now));
  let label = $derived(
    app.timer.status === 'paused' ? 'Paused'
      : app.timer.mode === 'focus' ? `Session ${sessionNumber(app.timer)} of ${CYCLE}`
      : app.timer.mode === 'short' ? 'Short break' : 'Long break',
  );

  function openChoose() {
    app.changing = app.active;
    app.view = 'choose';
  }
</script>

<div class="modes well" role="radiogroup" aria-label="Mode">
  {#each modes as m (m.id)}
    <button role="radio" aria-checked={app.timer.mode === m.id} class:on={app.timer.mode === m.id}
      disabled={app.active && app.timer.mode !== m.id} onclick={() => app.setMode(m.id)}>{m.label}</button>
  {/each}
</div>

<div class="timer">
  <div class="ring">
    <svg viewBox="0 0 224 224" aria-hidden="true">
      <defs>
        <linearGradient id="pink" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#E39EAD" /><stop offset="1" stop-color="#BF788A" />
        </linearGradient>
      </defs>
      <circle cx="112" cy="112" r={R} class="track" />
      {#if app.active}
        <circle cx="112" cy="112" r={R} class="bar" stroke-dasharray={C} stroke-dashoffset={C * (1 - frac)} />
      {/if}
      <circle cx="112" cy="112" r="91" class="disc" />
    </svg>

    {#if app.active}
      <div class="ring-dog"><img src="/img/dog-peek.png" alt="Stitch" draggable="false" /></div>
      <div class="readout running">
        <div class="sub">{label}</div>
        <div class="time small">{formatMs(app.remaining)}</div>
      </div>
    {:else}
      <div class="readout">
        <div class="time">{formatMs(app.remaining)}</div>
        <div class="sub">{app.timer.mode === 'focus' ? 'Ready to focus' : 'Ready for a break'}</div>
      </div>
    {/if}
  </div>
</div>

{#if app.timer.mode === 'focus' || app.currentTask}
  <div class="chip well">
    <Icon name="todo" size={18} />
    {#if app.currentTask}
      <span class="task">{app.currentTask.title}</span>
      <button class="link" onclick={openChoose}>Change</button>
    {:else if app.active}
      <span class="task none">No task</span>
      <button class="link" onclick={openChoose}>Add a task</button>
    {:else}
      <button class="task none pick" onclick={openChoose}>No task selected</button>
    {/if}
  </div>
{/if}

<div class="spacer"></div>

{#if app.active}
  <div class="controls">
    <button class="ctl circle raised" aria-label="Reset" title="Reset" onclick={() => app.resetTimer()}>
      <Icon name="reset" size={22} />
    </button>
    {#if app.timer.status === 'running'}
      <button class="big circle" aria-label="Pause" title="Pause" onclick={() => app.pauseTimer()}><Icon name="pause" size={28} /></button>
    {:else}
      <button class="big circle" aria-label="Resume" title="Resume" onclick={() => app.startTimer()}><Icon name="play" size={28} /></button>
    {/if}
    <button class="ctl circle raised" aria-label="Skip" title="Skip" onclick={() => app.skipTimer()}>
      <Icon name="skip" size={20} />
    </button>
  </div>
{:else}
  <PeekButton onclick={() => app.pressStart()}><Icon name="play" size={20} /> Start</PeekButton>
{/if}

<style>
  /* Figma Mode Switch: 48 high, padding 4, gap 4, segments 40 high */
  .modes {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 28px;
    width: 100%;
    flex: none;
  }
  .modes button {
    flex: 1;
    height: 40px;
    padding: 0 8px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    white-space: nowrap;
    border: 1px solid transparent;
  }
  .modes button.on {
    background: var(--raised-strong);
    border-color: var(--edge);
    box-shadow: var(--raised-shadow);
    color: var(--text);
    font-weight: 700;
  }
  .modes button:disabled {
    opacity: 1;
  }
  .timer {
    width: 100%;
    display: flex;
    justify-content: center;
    flex: none;
  }
  .ring {
    position: relative;
    width: 224px;
    height: 224px;
  }
  svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
    overflow: visible;
  }
  .track {
    fill: none;
    stroke: rgba(255, 255, 255, 0.16);
    stroke-width: 14;
  }
  .bar {
    fill: none;
    stroke: url(#pink);
    stroke-width: 14;
    transition: stroke-dashoffset 0.25s linear;
  }
  .disc {
    fill: rgba(255, 255, 255, 0.12);
    stroke: rgba(255, 255, 255, 0.32);
    stroke-width: 1;
  }
  .readout {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
  }
  /* Figma Time (running): top 153.7, Session 13 medium, time 24 bold */
  .readout.running {
    inset: auto 0 auto 0;
    top: 153.7px;
  }
  .time {
    font-size: 52px;
    font-weight: 700;
    letter-spacing: -1.5px;
    font-variant-numeric: tabular-nums;
  }
  .time.small {
    font-size: 28px;
  }
  .sub {
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
  }
  /* Figma Dog head (smiling): 152 x 185.4 at (36, -31.7) */
  .ring-dog {
    position: absolute;
    left: 36px;
    top: -31.7px;
    width: 152px;
    height: 185.4px;
    overflow: hidden;
    pointer-events: none;
  }
  .ring-dog img {
    position: absolute;
    left: -4.33%;
    top: -12.61%;
    width: 114.29%;
    height: 125.48%;
    max-width: none;
  }
  .task {
    flex: 1;
    min-width: 0;
    font-weight: 700;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: left;
  }
  .task.none {
    font-weight: 500;
    color: var(--muted);
  }
  .spacer {
    flex: 1;
    min-height: 20px;
  }
  /* Figma Controls: gap 22, 52 / 72 / 52 */
  .controls {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 22px;
    width: 100%;
    flex: none;
  }
  .ctl {
    width: 52px;
    height: 52px;
  }
  .big {
    width: 72px;
    height: 72px;
    background: var(--pink-grad);
    filter: var(--pink-glow);
    color: white;
  }
</style>
