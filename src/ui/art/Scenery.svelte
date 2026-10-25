<script lang="ts">
  import type { Scenery } from '../../logic/game';

  let { scenery }: { scenery: Scenery } = $props();

  const SKY: Record<Scenery, [string, string]> = {
    day: ['#7cc8ff', '#e3f5ff'],
    sunset: ['#ff8c6b', '#ffe0a3'],
    night: ['#14213d', '#3b5285'],
  };
  const HILLS: Record<Scenery, [string, string]> = {
    day: ['#8fd694', '#6bcb77'],
    sunset: ['#c98b6b', '#a86b55'],
    night: ['#2c3e66', '#22304f'],
  };
  const sky = $derived(SKY[scenery]);
  const hills = $derived(HILLS[scenery]);
  const STARS = [
    [120, 90], [300, 160], [520, 70], [760, 130], [980, 60], [1180, 150], [1400, 90], [220, 260], [880, 240], [1300, 260],
  ];
</script>

<svg class="scenery" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="sky-{scenery}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color={sky[0]} />
      <stop offset="1" stop-color={sky[1]} />
    </linearGradient>
  </defs>
  <rect width="1600" height="1000" fill="url(#sky-{scenery})" />

  {#if scenery === 'night'}
    {#each STARS as [x, y], i (i)}
      <circle cx={x} cy={y} r="3" fill="#fff8d6" class="star" style="animation-delay: {i * 0.3}s" />
    {/each}
    <circle cx="1320" cy="170" r="70" fill="#fff4c2" />
    <circle cx="1350" cy="150" r="62" fill={sky[0]} />
  {:else if scenery === 'sunset'}
    <circle cx="1250" cy="640" r="130" fill="#ffd166" opacity="0.9" />
  {:else}
    <circle cx="1350" cy="160" r="80" fill="#ffe066" />
  {/if}

  {#if scenery !== 'night'}
    <g class="clouds" fill="#ffffff" opacity="0.9">
      <g class="cloud slow"><ellipse cx="300" cy="180" rx="90" ry="40" /><ellipse cx="360" cy="160" rx="60" ry="45" /></g>
      <g class="cloud fast"><ellipse cx="900" cy="280" rx="110" ry="42" /><ellipse cx="960" cy="255" rx="70" ry="48" /></g>
    </g>
  {/if}

  <!-- Hügel -->
  <path d="M0,760 Q250,640 520,730 T1050,700 T1600,720 L1600,1000 L0,1000Z" fill={hills[0]} />
  <path d="M0,830 Q380,760 800,820 T1600,800 L1600,1000 L0,1000Z" fill={hills[1]} />
  <!-- Piste -->
  <rect x="0" y="880" width="1600" height="120" fill={scenery === 'night' ? '#3a3f4b' : '#6c757d'} />
  {#each Array.from({ length: 10 }, (_, i) => i) as i (i)}
    <rect x={40 + i * 160} y="934" width="90" height="12" rx="6" fill="#f8f9fa" opacity="0.85" />
  {/each}
</svg>

<style>
  .scenery {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .cloud {
    animation: drift 40s linear infinite alternate;
  }
  .cloud.fast {
    animation-duration: 28s;
  }
  .star {
    animation: twinkle 2.4s ease-in-out infinite alternate;
  }
  @keyframes drift {
    to {
      transform: translateX(180px);
    }
  }
  @keyframes twinkle {
    to {
      opacity: 0.3;
    }
  }
</style>
