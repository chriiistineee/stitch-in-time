<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { clampEstimate, unfinished } from '$lib/tasks';
  import Stepper from './Stepper.svelte';
  import Icon from './Icon.svelte';
  import PeekButton from './PeekButton.svelte';

  let list = $derived(unfinished(app.tasks));
  let selected = $state<number | null>(app.currentTaskId);
  // How many sessions the selected task needs. Asked here, just before the start.
  const first = app.tasks.find((x) => x.id === app.currentTaskId);
  let sessions = $state(first?.estimate ?? 1);
  let minSessions = $state(Math.max(1, first?.completed_pomodoros ?? 0));

  function select(id: number) {
    if (selected === id) {
      selected = null;
      return;
    }
    selected = id;
    const t = app.tasks.find((x) => x.id === id);
    sessions = t?.estimate ?? 1;
    minSessions = Math.max(1, t?.completed_pomodoros ?? 0);
  }

  async function confirmChoice() {
    if (selected !== null) {
      const t = app.tasks.find((x) => x.id === selected);
      if (t && t.estimate !== sessions) await app.patchTask(t.id, { estimate: clampEstimate(sessions, t.completed_pomodoros) });
    }
    if (app.changing) {
      if (selected !== null) app.attachTask(selected);
    } else {
      app.startFocus(selected);
    }
  }
  function key(e: KeyboardEvent, id: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select(id);
    }
  }
</script>

<div class="heading">
  <h1>{app.changing ? 'Which task now?' : 'What will you focus on?'}</h1>
  <p>{app.changing ? 'The timer keeps running and counts toward the new task.' : 'Pick a task from your list to start this pomodoro.'}</p>
</div>

{#if list.length > 0}
  <div class="list" role="radiogroup" aria-label="Tasks">
    {#each list as t (t.id)}
      <div role="radio" tabindex="0" aria-checked={selected === t.id} class="row" class:raised={selected !== t.id} class:sel={selected === t.id}
        onclick={() => select(t.id)} onkeydown={(e) => key(e, t.id)}>
        {#if selected === t.id}
          <img class="radio" src="/icons/radio-on.svg" alt="" width="24" height="24" />
        {:else}
          <span class="radio empty"></span>
        {/if}
        <span class="title">{t.title}</span>
        {#if selected === t.id}
          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
          <span class="sessions" onclick={(e) => e.stopPropagation()} title="Sessions for this task">
            <Stepper bind:value={sessions} min={minSessions} />
          </span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="or"><span></span>or task not listed<span></span></div>
{/if}

<button class="secondary raised" onclick={() => (app.view = 'create')}>
  <Icon name="plus" size={18} /> Create new task
</button>

<div class="spacer"></div>

<PeekButton onclick={confirmChoice} disabled={app.changing && selected === null} wide>
  {#if app.changing}<Icon name="check" size={20} /> Use this task{:else}<Icon name="play" size={20} /> Start focus{/if}
</PeekButton>

<style>
  .heading {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: none;
  }
  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
  }
  p {
    margin: 0;
    font-size: 14px;
    font-weight: 400;
    color: var(--muted);
  }
  .list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    max-height: 183px;
    overflow-y: auto;
    flex: none;
    padding: 2px;
    margin: -2px;
  }
  /* Figma Task row: padding 14 16 14 14, radius 24, gap 12, 15 medium */
  .row {
    flex: none;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px 14px 14px;
    border-radius: 24px;
    text-align: left;
    font-size: 16px;
    font-weight: 500;
    width: 100%;
  }
  .row {
    cursor: pointer;
  }
  .row.sel {
    background: rgba(227, 158, 173, 0.28);
    border: 1.5px solid var(--pink-check);
    font-weight: 700;
    padding-top: 7px;
    padding-bottom: 7px;
    min-height: 55px;
  }
  .sessions {
    flex: none;
    margin-right: -8px;
  }
  .radio {
    flex: none;
    width: 24px;
    height: 24px;
  }
  .radio.empty {
    border-radius: 12px;
    border: 1.6px solid var(--faint);
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Figma Or: 1.5 px lines, 12 medium, gap 12 */
  .or {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    font-size: 13px;
    font-weight: 500;
    color: var(--muted);
    white-space: nowrap;
    flex: none;
  }
  .or span {
    flex: 1;
    height: 1.5px;
    background: rgba(255, 255, 255, 0.28);
  }
  /* Figma Button/secondary: 54 high, radius 27, 15 bold, gap 10 */
  .secondary {
    width: 100%;
    height: 54px;
    border-radius: 27px;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    flex: none;
  }
  .spacer {
    flex: 1;
    min-height: 20px;
  }
</style>
