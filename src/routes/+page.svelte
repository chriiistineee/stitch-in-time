<script lang="ts">
  import '@fontsource/space-grotesk/400.css';
  import '@fontsource/space-grotesk/500.css';
  import '@fontsource/space-grotesk/700.css';
  import '../app.css';
  import { onMount } from 'svelte';
  import { app } from '$lib/app.svelte';
  import { inTauri } from '$lib/db';
  import { debugLog, onOpenSettings, onQuitRequested, windowFrame } from '$lib/native';
  import { BASE_W, dragResize, dragWindow, isControl } from '$lib/windowDrag';
  import ChooseTask from '$lib/components/ChooseTask.svelte';
  import CreateTask from '$lib/components/CreateTask.svelte';
  import Header from '$lib/components/Header.svelte';
  import Minimized from '$lib/components/Minimized.svelte';
  import Overlays from '$lib/components/Overlays.svelte';
  import PomodoroView from '$lib/components/PomodoroView.svelte';
  import SettingsView from '$lib/components/SettingsView.svelte';
  import TodoView from '$lib/components/TodoView.svelte';

  // The UI is laid out at the Figma size (360 x 600) and scaled to the window.
  // The minimized views are larger than Figma so Stitch is easy to see.
  // Keep these in step with PILL_ZOOM and DOG_ZOOM in src-tauri/src/lib.rs.
  const PILL_ZOOM = 1.4;
  const DOG_ZOOM = 1.7;
  let width = $state(BASE_W);
  $effect(() => {
    const zoom = app.minimized ? (app.active ? PILL_ZOOM : DOG_ZOOM) : inTauri ? width / BASE_W : 1;
    document.body.style.setProperty('zoom', String(zoom));
    debugLog(`zoom ${zoom} width ${width} inner ${window.innerWidth}`);
  });

  // Strong glass while the app is in use, clear when it is not.
  let active = $state(true);
  $effect(() => {
    document.documentElement.classList.toggle('inactive', inTauri && !active);
  });

  /** Drag the window from any place that is not a control. */
  function shellDown(e: PointerEvent) {
    if (e.button !== 0 || isControl(e.target)) return;
    dragWindow(e);
  }

  onMount(() => {
    if (!inTauri) document.documentElement.classList.add('browser');
    const onResize = () => windowFrame().then((f) => {
      if (f && !app.minimized) width = f.w;
    });
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('focus', () => (active = true));
    window.addEventListener('blur', () => (active = false));
    active = document.hasFocus();
    app.init();
    onQuitRequested(() => app.requestQuit());
    onOpenSettings(() => {
      if (app.minimized) app.expand();
      app.view = 'settings';
    });
  });
</script>

{#if app.minimized}
  <Minimized />
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <main class="shell" onpointerdown={shellDown}>
    <Header />
    {#if app.view === 'settings'}
      <SettingsView />
    {:else if app.tab === 'todo'}
      <TodoView />
    {:else if app.view === 'choose'}
      <ChooseTask />
    {:else if app.view === 'create'}
      <CreateTask />
    {:else}
      <PomodoroView />
    {/if}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="resize" title="Drag to resize" onpointerdown={dragResize}></div>
  </main>
{/if}
<Overlays />

<style>
  .shell {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    /* Figma Frame: padding 24 24 28, gap 20, radius 44 */
    gap: 20px;
    padding: 24px 24px 28px;
    border-radius: var(--radius);
    /* A light dark tint keeps white text readable on a bright desktop. */
    background: rgba(30, 24, 40, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.3);
    overflow: hidden;
    transition: background 0.2s, border-color 0.2s;
  }
  /* Not in use: clear glass and a lighter tint. */
  :global(html.inactive) .shell {
    background: rgba(30, 24, 40, 0.04);
  }
  /* Bottom-right corner: drag to resize. */
  .resize {
    position: absolute;
    right: 0;
    bottom: 0;
    width: 28px;
    height: 28px;
    cursor: nwse-resize;
    z-index: 3;
  }
</style>
