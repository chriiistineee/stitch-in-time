<script lang="ts">
  // Figma Nav Bar: tabs (flex, 48 high) + two 38 px round buttons, gap 10.
  import { app, type Tab } from '$lib/app.svelte';
  import Icon from './Icon.svelte';

  function go(tab: Tab) {
    app.tab = tab;
    app.view = 'main';
  }
  let current = $derived(app.view === 'settings' ? null : app.tab);
</script>

<header data-tauri-drag-region>
  <div class="tabs well" role="tablist">
    <button role="tab" aria-selected={current === 'todo'} class:on={current === 'todo'} onclick={() => go('todo')}>
      <Icon name="todo" size={16} /> To-do
    </button>
    <button role="tab" aria-selected={current === 'pomodoro'} class:on={current === 'pomodoro'} onclick={() => go('pomodoro')}>
      <Icon name="timer" size={16} /> Pomodoro
    </button>
  </div>
  <button class="nav-btn circle raised" title="Minimize" aria-label="Minimize" onclick={() => app.minimize()}>
    <Icon name="minimize" size={17} />
  </button>
  <button class="nav-btn circle raised" title="Quit" aria-label="Quit" onclick={() => app.requestQuit()}>
    <Icon name="x" size={17} />
  </button>
</header>

<style>
  header {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: none;
  }
  .tabs {
    flex: 1;
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 28px;
  }
  .tabs button {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    padding: 0 8px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    color: var(--muted);
    white-space: nowrap;
    border: 1px solid transparent;
  }
  .tabs button.on {
    background: var(--raised-strong);
    border-color: var(--edge);
    box-shadow: var(--raised-shadow);
    color: var(--text);
    font-weight: 700;
  }
  .nav-btn {
    width: 38px;
    height: 38px;
  }
</style>
