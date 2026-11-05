<script lang="ts">
  import { EST_MAX, EST_MIN } from '$lib/tasks';
  import Icon from './Icon.svelte';
  let { value = $bindable(), min = EST_MIN, max = EST_MAX }: { value: number; min?: number; max?: number } = $props();
</script>

<div class="stepper well" role="group" aria-label="Sessions">
  <button aria-label="Fewer" disabled={value <= min} onclick={() => (value = Math.max(min, value - 1))}>
    <Icon name="minus" size={16} />
  </button>
  <span aria-live="polite">{value}</span>
  <button aria-label="More" disabled={value >= max} onclick={() => (value = Math.min(max, value + 1))}>
    <Icon name="plus" size={16} />
  </button>
</div>

<style>
  .stepper {
    display: inline-flex;
    align-items: center;
    border-radius: 20px;
    height: 40px;
    padding: 0 4px;
    flex: none;
  }
  button {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
  }
  button:not(:disabled):hover {
    background: var(--raised);
  }
  span {
    min-width: 28px;
    text-align: center;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
</style>
