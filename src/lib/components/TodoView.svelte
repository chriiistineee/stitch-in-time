<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { validTitle, visible } from '$lib/tasks';
  import Icon from './Icon.svelte';

  let list = $derived(visible(app.tasks, app.hideDone));
  let newTitle = $state('');

  // Inline edit
  let editId = $state<number | null>(null);
  let editTitle = $state('');

  function beginEdit(id: number) {
    const t = app.tasks.find((x) => x.id === id);
    if (!t) return;
    editId = id;
    editTitle = t.title;
  }
  async function saveEdit() {
    if (editId === null || !validTitle(editTitle)) return;
    const t = app.tasks.find((x) => x.id === editId);
    await app.renameTask(editId, editTitle, t?.estimate ?? 1);
    editId = null;
  }
  function editKey(e: KeyboardEvent) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') editId = null;
  }

  async function add(e: SubmitEvent) {
    e.preventDefault();
    if (!validTitle(newTitle)) return;
    await app.createTask(newTitle, 1);
    newTitle = '';
  }

  // Drag to reorder with the grip (pointer events work in WKWebView).
  let dragId = $state<number | null>(null);
  let overIndex = $state<number | null>(null);
  let rows: HTMLElement[] = $state([]);

  function gripDown(e: PointerEvent, id: number) {
    dragId = id;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function gripMove(e: PointerEvent) {
    if (dragId === null) return;
    let idx = list.length - 1;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]?.getBoundingClientRect();
      if (r && e.clientY < r.top + r.height / 2) {
        idx = i;
        break;
      }
    }
    overIndex = idx;
  }
  async function gripUp() {
    if (dragId !== null && overIndex !== null) {
      const fromVisible = list.findIndex((t) => t.id === dragId);
      const target = list[overIndex];
      const from = app.tasks.findIndex((t) => t.id === dragId);
      const to = app.tasks.findIndex((t) => t.id === target?.id);
      if (from >= 0 && to >= 0 && fromVisible !== overIndex) await app.moveTask(from, to);
    }
    dragId = null;
    overIndex = null;
  }
</script>

<div class="head">
  <h1>Today</h1>
  <span class="meta">
    {app.doneCount} of {app.tasks.length} done
    {#if app.doneCount > 0}
      · <button class="link" onclick={() => (app.hideDone = !app.hideDone)}>{app.hideDone ? 'Show done' : 'Hide done'}</button>
    {/if}
  </span>
</div>

<div class="list">
  {#if app.tasks.length === 0}
    <div class="empty">
      <img src="/img/dog-neutral.png" alt="" draggable="false" />
      <p>No tasks yet. Add one below.</p>
    </div>
  {:else if list.length === 0}
    <div class="empty"><p>All tasks are done.</p></div>
  {/if}

  {#each list as t, i (t.id)}
    <div class="row raised" class:done={t.done} class:dragging={dragId === t.id}
      class:drop-target={overIndex === i && dragId !== t.id} bind:this={rows[i]}>
      {#if editId === t.id}
        <!-- svelte-ignore a11y_autofocus -->
        <input class="edit" bind:value={editTitle} onkeydown={editKey} autofocus aria-label="Task name" />
        <button class="mini circle" aria-label="Save" title="Save" disabled={!validTitle(editTitle)} onclick={saveEdit}>
          <Icon name="check" size={14} />
        </button>
      {:else}
        <button class="grip" aria-label="Drag to reorder" title="Drag to reorder"
          onpointerdown={(e) => gripDown(e, t.id)} onpointermove={gripMove} onpointerup={gripUp} onpointercancel={gripUp}>
          <Icon name="grip" size={12} />
        </button>
        <button class="check" class:on={t.done} role="checkbox" aria-checked={t.done} aria-label="Done"
          onclick={() => app.toggleDone(t.id)}>
          {#if t.done}<Icon name="check" size={14} />{/if}
        </button>
        <span class="title">{t.title}</span>
        <span class="tools">
          <button class="mini circle" aria-label="Edit" title="Edit" onclick={() => beginEdit(t.id)}><Icon name="pencil" size={15} /></button>
          <button class="mini circle" aria-label="Delete" title="Delete" onclick={() => app.deleteTask(t.id)}><Icon name="trash" size={15} /></button>
        </span>
        {#if !t.done}
          <button class="start circle raised" class:current={app.currentTaskId === t.id && app.active}
            aria-label="Start focus on this task" title="Start focus" onclick={() => app.startTask(t.id)}>
            <Icon name="play" size={14} />
          </button>
        {/if}
      {/if}
    </div>
  {/each}
</div>

<form class="add well" onsubmit={add}>
  <Icon name="plus" size={18} />
  <input bind:value={newTitle} placeholder="Add a task" maxlength="120" aria-label="Add a task" />
</form>

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: none;
  }
  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
  }
  .meta {
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
  }
  .meta .link {
    font-size: 14px;
  }
  /* Figma Task List: gap 12 */
  .list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 2px;
    margin: -2px;
  }
  .empty {
    text-align: center;
    font-size: 14px;
    color: var(--muted);
    padding-top: 24px;
  }
  .empty img {
    width: 92px;
  }
  /* Figma Task: padding 10 10 10 14, radius 24, gap 12, 15 medium */
  .row {
    position: relative;
    flex: none;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 56px;
    padding: 10px 10px 10px 14px;
    border-radius: 24px;
    font-size: 16px;
    font-weight: 500;
  }
  .row.done {
    min-height: 52px;
    padding-right: 16px;
  }
  .row.dragging {
    opacity: 0.6;
  }
  .row.drop-target {
    box-shadow: 0 -3px 0 var(--pink-1);
  }
  .grip {
    position: absolute;
    left: 1px;
    top: 50%;
    transform: translateY(-50%);
    width: 12px;
    height: 28px;
    color: var(--faint);
    cursor: grab;
    display: none;
    place-items: center;
    touch-action: none;
  }
  .row:hover .grip {
    display: grid;
  }
  .check {
    flex: none;
    width: 24px;
    height: 24px;
    border-radius: 12px;
    border: 1.6px solid var(--faint);
    display: grid;
    place-items: center;
    color: white;
  }
  .check.on {
    border: 0;
    background: var(--pink-check);
  }
  .title {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .done .title {
    text-decoration: line-through;
    color: var(--muted);
  }
  .tools {
    display: none;
    gap: 2px;
  }
  .row:hover .tools,
  .row:focus-within .tools {
    display: flex;
  }
  .mini {
    width: 28px;
    height: 28px;
    color: var(--muted);
  }
  .mini:hover {
    color: var(--text);
    background: var(--raised);
  }
  /* Figma Button/start-pomodoro: 36 round, play 14 */
  .start {
    width: 36px;
    height: 36px;
  }
  .start.current {
    background: var(--pink-grad);
    border-color: transparent;
  }
  .edit {
    flex: 1;
    min-width: 0;
    height: 36px;
    border: 1px solid var(--pink-1);
    border-radius: 18px;
    padding: 0 12px;
    background: rgba(255, 255, 255, 0.12);
    outline: none;
  }
  /* Figma Add Task: 52 high, radius 26, padding 0 18, gap 10 */
  .add {
    flex: none;
    display: flex;
    align-items: center;
    gap: 10px;
    height: 52px;
    border-radius: 26px;
    padding: 0 18px;
    color: var(--muted);
  }
  .add input {
    flex: 1;
    border: 0;
    background: none;
    outline: none;
    font-size: 15px;
    font-weight: 500;
    color: var(--text);
  }
</style>
