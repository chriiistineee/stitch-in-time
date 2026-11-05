<script lang="ts">
  import { app } from '$lib/app.svelte';
  import { validTitle } from '$lib/tasks';
  import Icon from './Icon.svelte';
  import Stepper from './Stepper.svelte';

  let title = $state('');
  let estimate = $state(1);
  let ok = $derived(validTitle(title));
  let busy = $state(false);

  async function submit(e: SubmitEvent) {
    e.preventDefault();
    if (!ok || busy) return;
    busy = true;
    const t = await app.createTask(title, estimate);
    busy = false;
    if (!t) return;
    if (app.changing) app.attachTask(t.id);
    else app.startFocus(t.id);
  }
</script>

<form onsubmit={submit}>
  <div class="heading">
    <h1>Create new task</h1>
    <p>Give it a name and the number of sessions.</p>
  </div>

  <!-- svelte-ignore a11y_autofocus -->
  <input class="name well" bind:value={title} placeholder="Task name" maxlength="120" aria-label="Task name" autofocus />

  <div class="est raised">
    <div>
      <div class="lbl">Sessions</div>
      <div class="hint">25 minutes each</div>
    </div>
    <Stepper bind:value={estimate} />
  </div>

  <div class="spacer"></div>

  <button type="submit" class="primary" disabled={!ok || busy}>
    {#if app.changing}<Icon name="check" size={20} /> Create &amp; use{:else}<Icon name="play" size={20} /> Create &amp; start focus{/if}
  </button>
  <button type="button" class="cancel link" onclick={() => (app.view = 'choose')}>Cancel</button>
</form>

<style>
  form {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }
  .heading {
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  .name {
    height: 52px;
    border-radius: 26px;
    padding: 0 18px;
    font-size: 16px;
    border: 1px solid transparent;
    outline: none;
  }
  .name:focus {
    border-color: var(--pink-1);
  }
  .est {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 10px 10px 18px;
    border-radius: 24px;
  }
  .lbl {
    font-size: 16px;
    font-weight: 500;
  }
  .hint {
    font-size: 13px;
    color: var(--muted);
  }
  .spacer {
    flex: 1;
  }
  .cancel {
    margin-top: -8px;
    align-self: center;
    font-size: 15px;
  }
</style>
