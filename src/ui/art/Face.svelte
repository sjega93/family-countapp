<svelte:options namespace="svg" />

<script lang="ts" module>
  let counter = 0;
</script>

<script lang="ts">
  import type { FaceInfo } from '../faces';

  interface Props {
    face: FaceInfo;
    cx?: number;
    cy?: number;
    r?: number;
    /** Pilotenmütze für das Cockpit. */
    pilot?: boolean;
  }

  let { face, cx = 0, cy = 0, r = 50, pilot = false }: Props = $props();

  const clipId = `face-clip-${++counter}`;

  const SKIN = ['#f6d0b1', '#e8b48f', '#c98e66', '#8d5a3b', '#f1c7a0', '#d9a07a'];
  const HAIR = ['#3b2a20', '#7a4b2a', '#d8a24a', '#1d1d1d', '#a0522d', '#5c4033'];
  const BG = ['#ffd93d', '#6bcb77', '#4d96ff', '#ff6b6b', '#b388eb', '#ff9f45', '#4ecdc4', '#f78fb3'];

  const v = $derived(face.variant);
  const skin = $derived(SKIN[v % SKIN.length]);
  const hair = $derived(HAIR[(v * 5) % HAIR.length]);
  const bg = $derived(BG[v % BG.length]);
  const style = $derived(v % 4);
</script>

<g transform="translate({cx} {cy}) scale({r / 50})">
  <defs>
    <clipPath id={clipId}><circle r="50" /></clipPath>
  </defs>
  <g clip-path="url(#{clipId})">
    {#if face.imageUrl}
      <image href={face.imageUrl} x="-50" y="-50" width="100" height="100" preserveAspectRatio="xMidYMid slice" />
    {:else}
      <rect x="-50" y="-50" width="100" height="100" fill={bg} />
      <!-- Hals und Schultern -->
      <ellipse cx="0" cy="62" rx="40" ry="26" fill={pilot ? '#1f3a5f' : '#ffffff'} opacity="0.9" />
      <!-- Haare hinten -->
      {#if style === 1}
        <ellipse cx="0" cy="2" rx="34" ry="38" fill={hair} />
      {/if}
      <!-- Kopf -->
      <circle cx="0" cy="-2" r="28" fill={skin} />
      <!-- Haare vorn -->
      {#if style === 0}
        <path d="M-28,-8 Q-26,-34 0,-34 Q26,-34 28,-8 Q14,-22 0,-20 Q-14,-22 -28,-8Z" fill={hair} />
      {:else if style === 1}
        <path d="M-29,-6 Q-24,-36 4,-32 Q26,-30 29,-6 Q8,-26 -29,-6Z" fill={hair} />
      {:else if style === 2}
        <circle cx="-14" cy="-28" r="10" fill={hair} />
        <circle cx="2" cy="-31" r="11" fill={hair} />
        <circle cx="17" cy="-26" r="10" fill={hair} />
      {/if}
      <!-- Gesicht -->
      <circle cx="-10" cy="-4" r="3.6" fill="#2b2b2b" />
      <circle cx="10" cy="-4" r="3.6" fill="#2b2b2b" />
      <circle cx="-17" cy="6" r="4.5" fill="#ff8fa3" opacity="0.55" />
      <circle cx="17" cy="6" r="4.5" fill="#ff8fa3" opacity="0.55" />
      <path d="M-9,8 Q0,17 9,8" fill="none" stroke="#2b2b2b" stroke-width="3" stroke-linecap="round" />
    {/if}
    {#if pilot}
      <!-- Pilotenmütze -->
      <path d="M-30,-22 Q0,-48 30,-22 L26,-16 L-26,-16Z" fill="#1f3a5f" />
      <rect x="-30" y="-18" width="60" height="7" rx="3" fill="#13253d" />
      <circle cx="0" cy="-28" r="5" fill="#ffd93d" />
    {/if}
  </g>
  <circle r="50" fill="none" stroke="rgba(0,0,0,0.12)" stroke-width="3" />
</g>
