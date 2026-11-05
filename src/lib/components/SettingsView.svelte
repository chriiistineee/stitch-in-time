<script lang="ts">
  // Open with Cmd+, or Stitch in Time > Settings in the menu bar.
  import { app } from '$lib/app.svelte';
  import { playSessionEnd } from '$lib/native';
</script>

<div class="heading">
  <h1>Settings</h1>
  <p>Open this screen with Cmd+, at any time.</p>
</div>

<div class="card raised">
  <label class="item">
    <span>
      <span class="name">Launch at login</span>
      <span class="desc">Open Stitch in Time when you log in to your Mac.</span>
    </span>
    <input type="checkbox" checked={app.settings.launchAtLogin}
      onchange={(e) => app.setLaunch((e.currentTarget as HTMLInputElement).checked)} />
    <span class="switch"></span>
  </label>
  <div class="sep"></div>
  <label class="item">
    <span>
      <span class="name">Session-end sound</span>
      <span class="desc">Play a sound when a session or break ends.</span>
    </span>
    <input type="checkbox" checked={app.settings.sound}
      onchange={(e) => app.setSound((e.currentTarget as HTMLInputElement).checked)} />
    <span class="switch"></span>
  </label>
  <button class="link test" onclick={playSessionEnd}>Play the sound</button>
</div>

<div class="spacer"></div>
<button class="secondary raised" onclick={() => (app.view = 'main')}>Done</button>

<style>
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
  .card {
    border-radius: 24px;
    padding: 4px 18px 14px;
  }
  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 14px 0;
    cursor: pointer;
  }
  .name {
    display: block;
    font-weight: 500;
    font-size: 16px;
  }
  .desc {
    display: block;
    font-size: 13px;
    margin-top: 2px;
    color: var(--muted);
  }
  .item input {
    display: none;
  }
  .switch {
    flex: none;
    width: 40px;
    height: 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.2);
    position: relative;
    transition: background 0.15s;
  }
  .switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    transition: transform 0.15s;
  }
  .item input:checked + .switch {
    background: var(--pink-2);
  }
  .item input:checked + .switch::after {
    transform: translateX(16px);
  }
  .sep {
    height: 1px;
    background: rgba(255, 255, 255, 0.2);
  }
  .test {
    font-size: 13px;
  }
  .spacer {
    flex: 1;
  }
  .secondary {
    width: 100%;
    height: 54px;
    border-radius: 27px;
    font-size: 16px;
    font-weight: 700;
  }
</style>
