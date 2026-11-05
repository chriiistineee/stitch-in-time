<script lang="ts">
  import { app } from '$lib/app.svelte';

  function ok() {
    const c = app.confirm;
    app.confirm = null;
    c?.onConfirm();
  }
  function key(e: KeyboardEvent) {
    if (!app.confirm) return;
    if (e.key === 'Escape') app.confirm = null;
    if (e.key === 'Enter') ok();
  }
</script>

<svelte:window onkeydown={key} />

{#if app.confirm}
  <div class="scrim">
    <div class="dialog raised" role="alertdialog" aria-modal="true" aria-labelledby="dlg-title">
      <img src="/img/dog-neutral.png" alt="" draggable="false" />
      <h2 id="dlg-title">{app.confirm.title}</h2>
      <p>{app.confirm.message}</p>
      <div class="btns">
        <button class="cancel raised" onclick={() => (app.confirm = null)}>Cancel</button>
        <button class="primary ok" onclick={ok}>{app.confirm.confirmLabel}</button>
      </div>
    </div>
  </div>
{/if}

{#if app.undo}
  <div class="toast raised" role="status">
    <span>Task deleted</span>
    <button onclick={() => app.undoDelete()}>Undo</button>
  </div>
{/if}

<style>
  .scrim {
    position: fixed;
    inset: 0;
    border-radius: var(--radius);
    background: rgba(20, 16, 28, 0.35);
    display: grid;
    place-items: center;
    padding: 24px;
    z-index: 10;
  }
  .dialog {
    width: 100%;
    border-radius: 26px;
    padding: 22px 20px 20px;
    text-align: center;
    background: rgba(60, 50, 70, 0.55);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  img {
    width: 64px;
  }
  h2 {
    margin: 6px 0 6px;
    font-size: 19px;
    font-weight: 700;
  }
  p {
    margin: 0 0 18px;
    font-size: 14px;
  }
  .btns {
    display: flex;
    gap: 10px;
  }
  .btns button {
    flex: 1;
    height: 46px;
    border-radius: 23px;
    font-weight: 500;
    font-size: 16px;
  }
  .ok {
    box-shadow: 0 4px 12px rgba(191, 120, 137, 0.3);
  }
  .toast {
    position: fixed;
    left: 20px;
    right: 20px;
    bottom: 84px;
    height: 46px;
    border-radius: 23px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 18px;
    font-size: 15px;
    z-index: 5;
  }
  .toast button {
    font-weight: 700;
    color: var(--pink-1);
  }
  .toast {
    background: rgba(60, 50, 70, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
  p {
    color: var(--muted);
  }
</style>
