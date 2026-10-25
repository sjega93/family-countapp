<script lang="ts">
  import { scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import type { PlaneKind } from '../../logic/game';
  import type { FaceInfo } from '../faces';
  import Face from './Face.svelte';
  import { planeGeometry } from './planeGeometry';

  interface Props {
    kind: PlaneKind;
    seats: number;
    pilot: FaceInfo;
    /** Eingestiegene Gäste, Index = Sitzplatz. */
    boarded: FaceInfo[];
    /** Fenster, das beim Nachzählen gerade aufleuchtet (-1 = keins). */
    highlight?: number;
    waving?: boolean;
  }

  let { kind, seats, pilot, boarded, highlight = -1, waving = false }: Props = $props();

  const g = $derived(planeGeometry(kind, seats));
  const W = $derived(g.width);
  const top = $derived(g.bodyTop);
  const bh = $derived(g.bodyHeight);
  const bottom = $derived(g.bodyTop + g.bodyHeight);
  const midX = $derived(Math.max(260, g.bodyEnd * 0.5));

  const PALETTE: Record<PlaneKind, { body: string; tail: string; wing: string; stripe: string }> = {
    prop: { body: '#ffd93d', tail: '#ff6b6b', wing: '#ff9f45', stripe: '#ff6b6b' },
    jet: { body: '#f8f9fa', tail: '#4d96ff', wing: '#a9c9ff', stripe: '#4d96ff' },
    jumbo: { body: '#f8f9fa', tail: '#6bcb77', wing: '#b5e8bb', stripe: '#6bcb77' },
  };
  const c = $derived(PALETTE[kind]);
  const R = $derived(g.windowRadius);
</script>

<svg
  viewBox="0 0 {W} {g.height}"
  class="plane"
  class:waving
  role="img"
  aria-label="Flugzeug mit {seats} Plätzen"
>
  <!-- Leitwerk hinten -->
  <path
    d="M{g.bodyEnd - 30},{top + 12} L{W - 78},{top - 70} L{W - 22},{top - 70} L{W - 32},{top + 40} Z"
    fill={c.tail}
  />
  <!-- Heck, verjüngt -->
  <path
    d="M{g.bodyEnd - 40},{top} L{W - 18},{top + 18} Q{W - 6},{top + 34} {W - 18},{top + 52} L{g.bodyEnd - 40},{bottom} Z"
    fill={c.body}
  />
  <ellipse cx={W - 70} cy={top + 36} rx="54" ry="11" fill={c.tail} />

  <!-- Rumpf -->
  <rect x="30" y={top} width={g.bodyEnd - 30} height={bh} rx={bh / 2} fill={c.body} />
  <rect x="60" y={bottom - bh * 0.28} width={g.bodyEnd - 40} height="10" rx="5" fill={c.stripe} opacity="0.85" />

  <!-- Fahrwerk -->
  <g fill="#2b2b2b">
    <rect x="96" y={bottom - 4} width="8" height="18" />
    <circle cx="100" cy={bottom + 20} r="11" />
    <rect x={g.bodyEnd - 64} y={bottom - 4} width="8" height="18" />
    <circle cx={g.bodyEnd - 60} cy={bottom + 20} r="12" />
  </g>

  <!-- Cockpit mit Pilot -->
  <circle cx={g.cockpit.x} cy={g.cockpit.y} r={R + 6} fill="#1f3a5f" />
  <Face face={pilot} cx={g.cockpit.x} cy={g.cockpit.y} r={R} pilot />

  <!-- Passagierfenster -->
  {#each g.windows as w, i (i)}
    <g class="window" class:lit={highlight === i}>
      <circle cx={w.x} cy={w.y} r={R + 6} fill="#1f3a5f" />
      <circle cx={w.x} cy={w.y} r={R} fill="#cfe8ff" />
      {#if boarded[i]}
        <g style="transform-origin: {w.x}px {w.y}px" in:scale={{ duration: 450, start: 0.2, easing: backOut }}>
          <g class="seat" style="transform-origin: {w.x}px {w.y + R}px">
            <Face face={boarded[i]} cx={w.x} cy={w.y} r={R} />
          </g>
        </g>
      {/if}
      <circle class="glow" cx={w.x} cy={w.y} r={R + 10} fill="none" stroke="#ffd93d" stroke-width="8" />
    </g>
  {/each}

  <!-- Flügel vorn -->
  <path
    d="M{midX - 70},{bottom - 6} L{midX + 70},{bottom - 6} L{midX + 10},{bottom + 62} L{midX - 40},{bottom + 62} Z"
    fill={c.wing}
    stroke="rgba(0,0,0,0.08)"
    stroke-width="3"
  />
  {#if kind !== 'prop'}
    <rect x={midX - 48} y={bottom + 8} width="70" height="30" rx="15" fill="#d9dde3" />
    <circle cx={midX - 44} cy={bottom + 23} r="11" fill="#5b6470" />
  {/if}

  {#if kind === 'prop'}
    <g class="propeller" style="transform-origin: 26px {top + bh / 2}px">
      <ellipse cx="26" cy={top + bh / 2} rx="7" ry="58" fill="#5b6470" opacity="0.85" />
    </g>
    <circle cx="26" cy={top + bh / 2} r="12" fill="#ff6b6b" />
  {/if}
</svg>

<style>
  .plane {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .glow {
    opacity: 0;
    transition: opacity 0.2s;
  }
  .lit .glow {
    opacity: 1;
  }
  .propeller {
    animation: spin 0.18s linear infinite;
  }
  .waving .seat {
    animation: wave 0.6s ease-in-out infinite alternate;
  }
  @keyframes spin {
    from {
      transform: scaleY(1);
    }
    50% {
      transform: scaleY(0.15);
    }
    to {
      transform: scaleY(1);
    }
  }
  @keyframes wave {
    from {
      transform: rotate(-10deg);
    }
    to {
      transform: rotate(10deg);
    }
  }
</style>
