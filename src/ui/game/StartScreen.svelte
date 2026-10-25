<script lang="ts">
  import Airplane from '../art/Airplane.svelte';
  import Scenery from '../art/Scenery.svelte';
  import type { FaceInfo } from '../faces';

  let { pilot, onStart }: { pilot: FaceInfo; onStart: () => void } = $props();
</script>

<button class="start" onclick={onStart} aria-label="Spiel starten">
  <Scenery scenery="day" />
  <div class="plane">
    <Airplane kind="prop" seats={2} {pilot} boarded={[]} />
  </div>
  <div class="tap" aria-hidden="true"></div>
</button>

<style>
  .start {
    position: fixed;
    inset: 0;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    overflow: hidden;
  }
  .plane {
    position: absolute;
    left: 50%;
    top: 52%;
    width: min(70vw, 110vh);
    transform: translate(-50%, -50%);
    animation: bob 1.6s ease-in-out infinite alternate;
  }
  .tap {
    position: absolute;
    left: 50%;
    top: 52%;
    width: 18vmin;
    height: 18vmin;
    margin: -9vmin 0 0 -9vmin;
    border-radius: 50%;
    border: 1.2vmin solid rgba(255, 255, 255, 0.9);
    animation: pulse 1.6s ease-out infinite;
    pointer-events: none;
  }
  @keyframes bob {
    to {
      transform: translate(-50%, -54%) rotate(-2deg);
    }
  }
  @keyframes pulse {
    from {
      transform: scale(0.6);
      opacity: 1;
    }
    to {
      transform: scale(2.2);
      opacity: 0;
    }
  }
</style>
