<script lang="ts">
  import Airplane from '../art/Airplane.svelte';
  import Scenery from '../art/Scenery.svelte';
  import type { FaceInfo } from '../faces';

  interface Props {
    pilot: FaceInfo;
    /** Daten werden noch geladen: Tippen startet noch nicht. */
    waiting?: boolean;
    /** Laden fehlgeschlagen (z. B. kein Internet): Tippen versucht es erneut. */
    offline?: boolean;
    onStart: () => void;
    onParents: () => void;
  }

  let { pilot, waiting = false, offline = false, onStart, onParents }: Props = $props();
</script>

<div class="start">
  <button class="tap-area" onclick={onStart} aria-label={offline ? 'Erneut verbinden' : 'Spiel starten'} aria-busy={waiting}>
    <Scenery scenery={offline ? 'night' : 'day'} />
    <div class="plane" class:waiting>
      <Airplane kind="prop" seats={2} {pilot} boarded={[]} />
    </div>
    {#if offline}
      <div class="offline" aria-hidden="true">
        <svg viewBox="0 0 120 90">
          <path d="M30 70a20 20 0 0 1 2-40 28 28 0 0 1 54 6 17 17 0 0 1 4 34Z" fill="#fff" />
          <path d="M50 42l20 20M70 42L50 62" stroke="#ff6b6b" stroke-width="8" stroke-linecap="round" />
        </svg>
      </div>
    {:else if !waiting}
      <div class="ring" aria-hidden="true"></div>
    {/if}
  </button>

  <button class="parents" aria-label="Eltern-Bereich" onclick={onParents}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.6 4.9-1.7 1.3.2 2.1-1.9 1.9-2.1-.2-1.3 1.7h-2.6l-1.3-1.7-2.1.2-1.9-1.9.2-2.1-1.7-1.3v-2.8l1.7-1.3-.2-2.1 1.9-1.9 2.1.2 1.3-1.7h2.6l1.3 1.7 2.1-.2 1.9 1.9-.2 2.1 1.7 1.3Z"
      />
    </svg>
  </button>
</div>

<style>
  .start,
  .tap-area {
    position: fixed;
    inset: 0;
  }
  .tap-area {
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
  .plane.waiting {
    opacity: 0.75;
    animation-duration: 0.6s;
  }
  .ring {
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
  .offline {
    position: absolute;
    left: 50%;
    top: 18%;
    width: 22vmin;
    transform: translateX(-50%);
    animation: bob 2s ease-in-out infinite alternate;
  }
  .parents {
    position: absolute;
    top: max(1.5vmin, env(safe-area-inset-top));
    right: max(1.5vmin, env(safe-area-inset-right));
    width: 9vmin;
    height: 9vmin;
    min-width: 36px;
    min-height: 36px;
    padding: 1.5vmin;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.25);
    color: rgba(0, 0, 0, 0.35);
  }
  .parents svg {
    width: 100%;
    height: 100%;
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
