<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { fly, fade, scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import {
    createGame,
    step,
    visibleQueue,
    VISIBLE_QUEUE,
    type Effect,
    type GameContext,
    type GameEvent,
  } from '../../logic/game';
  import type { GameSettings } from '../../logic/settings';
  import type { FaceInfo } from '../faces';
  import Airplane from '../art/Airplane.svelte';
  import Face from '../art/Face.svelte';
  import Scenery from '../art/Scenery.svelte';
  import { chime, engineRoll, honk, pop, puff, sparkle, takeoff } from '../../services/audio/sounds';
  import { sayLine, sayNumber, sayTotal, stopSpeaking } from '../../services/audio/voice';
  import { planeGeometry } from '../art/planeGeometry';

  interface Props {
    settings: GameSettings;
    pilot: FaceInfo;
    passengers: FaceInfo[];
    rewards: FaceInfo[];
    onParents: () => void;
  }

  let { settings, pilot, passengers, rewards, onParents }: Props = $props();

  const ARRIVE_SECONDS = 2.4;
  const DEPART_SECONDS = 3.4;
  const HELP_AFTER_MS = 5000;
  const HELP_REPEAT_MS = 9000;
  const REWARD_MS = 4000;

  // Nur der Start der Komponente zählt; neue Einstellungen starten das Spiel neu (über {#key} in App).
  // svelte-ignore state_referenced_locally
  const ctx: GameContext = { pool: passengers, rng: Math.random };
  // svelte-ignore state_referenced_locally
  let game = $state(createGame(settings, ctx));
  let alive = true;

  const faceById = $derived(new Map(passengers.map((p) => [p.id, p])));
  const queue = $derived(visibleQueue(game));
  const behind = $derived(game.waiting.slice(VISIBLE_QUEUE));
  const seats = $derived(game.settings.flights[game.flightIndex]);
  const boardedFaces = $derived(game.boarded.map((p) => faceById.get(p.id)!));
  const flightKey = $derived(`${game.round}-${game.flightIndex}`);
  const geom = $derived(planeGeometry(game.plane, seats));
  const reward = $derived(rewards.length ? rewards[(game.round - 1) % rewards.length] : pilot);

  let highlight = $state(-1);
  let takeoffStarted = $state(false);
  let planeWiggle = $state(false);
  let hopId = $state<string | null>(null);
  let puffs = $state<{ id: number; x: number; y: number }[]>([]);
  let lastSpeech: Promise<void> = Promise.resolve();
  let lastTap = Date.now();
  let lastHelp = 0;

  function dispatch(event: GameEvent) {
    if (!alive) return;
    const r = step(game, event, ctx);
    game = r.state;
    void runEffects(r.effects);
  }

  async function runEffects(effects: Effect[]) {
    for (const e of effects) {
      if (!alive) return;
      switch (e.type) {
        case 'boarded':
          pop();
          break;
        case 'count':
          stopSpeaking();
          lastSpeech = sayNumber(e.n);
          break;
        case 'recount':
          await recount(e.total);
          break;
        case 'say':
          if (e.line === 'greeting') {
            lastSpeech = sayLine('greeting');
            await lastSpeech;
            lastTap = Date.now();
          } else if (e.line === 'allAboard') {
            await sayLine('allAboard');
            if (!alive) return;
            takeoff(DEPART_SECONDS);
            takeoffStarted = true;
          } else if (e.line === 'bye') {
            await wait(900);
            void sayLine('bye');
          } else {
            await sayLine(e.line);
          }
          break;
      }
    }
  }

  async function recount(total: number) {
    await lastSpeech;
    await wait(400);
    for (let i = 0; i < total; i++) {
      if (!alive) return;
      highlight = i;
      chime(i);
      await sayNumber(i + 1);
      await wait(120);
    }
    highlight = -1;
    await sayTotal(total);
    await wait(300);
    dispatch({ type: 'RECOUNT_DONE' });
  }

  function wait(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // Svelte versieht Animationsnamen mit einem Präfix, daher Vergleich über das Ende.
  const isAnim = (e: AnimationEvent, name: string) => e.target === e.currentTarget && e.animationName.endsWith(name);

  function onPlaneAnimationEnd(e: AnimationEvent) {
    if (isAnim(e, 'arrive') && game.phase === 'arriving') dispatch({ type: 'ARRIVED' });
    else if (isAnim(e, 'depart') && game.phase === 'departing' && takeoffStarted) {
      takeoffStarted = false;
      dispatch({ type: 'DEPARTED' });
    }
  }

  function onPlaneAnimationStart(e: AnimationEvent) {
    if (isAnim(e, 'arrive') && game.phase === 'arriving') engineRoll(ARRIVE_SECONDS);
  }

  function tapGuest(id: string, ev: Event) {
    ev.stopPropagation();
    lastTap = Date.now();
    hopId = null;
    dispatch({ type: 'TAP_PASSENGER', id });
  }

  function tapPlane(ev: Event) {
    ev.stopPropagation();
    lastTap = Date.now();
    if (game.phase === 'arriving' || game.phase === 'departing' || planeWiggle) return;
    planeWiggle = true;
    honk();
    setTimeout(() => (planeWiggle = false), 600);
  }

  let puffId = 0;
  function tapSky(ev: PointerEvent) {
    if (game.phase === 'goodnight') return;
    lastTap = Date.now();
    const id = ++puffId;
    puffs = [...puffs.slice(-4), { id, x: ev.clientX, y: ev.clientY }];
    puff();
    setTimeout(() => (puffs = puffs.filter((p) => p.id !== id)), 900);
  }

  function parentsButton(ev: Event) {
    ev.stopPropagation();
    onParents();
  }

  // Hilfe bei Inaktivität: das nächste Gesicht hüpft, die Stimme fragt nach.
  const helpTimer = setInterval(() => {
    if (game.phase !== 'boarding') return;
    const now = Date.now();
    if (now - lastTap > HELP_AFTER_MS && now - lastHelp > HELP_REPEAT_MS) {
      lastHelp = now;
      hopId = queue[0]?.id ?? null;
      lastSpeech = sayLine('help');
      setTimeout(() => (hopId = null), 2400);
    }
  }, 500);

  // Belohnung zeigen, dann geht es automatisch weiter.
  $effect(() => {
    if (game.phase === 'reward') {
      sparkle();
      const t = setTimeout(() => dispatch({ type: 'REWARD_DONE' }), REWARD_MS);
      return () => clearTimeout(t);
    }
  });

  let timeLimit: ReturnType<typeof setTimeout> | undefined;
  onMount(() => {
    if (settings.timeLimitMinutes) {
      timeLimit = setTimeout(() => dispatch({ type: 'TIME_UP' }), settings.timeLimitMinutes * 60_000);
    }
  });

  onDestroy(() => {
    alive = false;
    clearInterval(helpTimer);
    clearTimeout(timeLimit);
    stopSpeaking();
  });
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="stage" onpointerdown={tapSky} data-phase={game.phase}>
  <Scenery scenery={game.phase === 'goodnight' ? 'night' : game.scenery} />

  {#if game.phase !== 'reward'}
    <div class="plane-area">
      {#key flightKey}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div
          class="plane-wrap"
          class:arriving={game.phase === 'arriving'}
          class:departing={game.phase === 'departing' && takeoffStarted}
          class:wiggle={planeWiggle}
          style="--ratio: {geom.width / geom.height}; --arrive: {ARRIVE_SECONDS}s; --depart: {DEPART_SECONDS}s"
          onanimationstart={onPlaneAnimationStart}
          onanimationend={onPlaneAnimationEnd}
          onpointerdown={tapPlane}
          role="button"
          tabindex="-1"
        >
          <Airplane
            kind={game.plane}
            {seats}
            {pilot}
            boarded={boardedFaces}
            {highlight}
            waving={game.phase === 'departing'}
          />
        </div>
      {/key}
    </div>
  {/if}

  {#if game.phase === 'boarding' || game.phase === 'arriving'}
    <div class="gate" class:dim={game.phase === 'arriving'} transition:fade={{ duration: 300 }}>
      <div class="front">
        {#each queue as p (p.id)}
          <button
            class="guest"
            class:hop={hopId === p.id}
            aria-label="Gast einsteigen lassen"
            disabled={game.phase !== 'boarding'}
            onpointerdown={(ev) => tapGuest(p.id, ev)}
            in:scale={{ duration: 350, start: 0.4, easing: backOut }}
            out:fly={{ duration: 350, x: 160, y: -40, opacity: 0 }}
          >
            <svg viewBox="-52 -52 104 104"><Face face={faceById.get(p.id)!} r={50} /></svg>
          </button>
        {/each}
      </div>
      {#if behind.length}
        <div class="behind" aria-hidden="true">
          {#each behind as p (p.id)}
            <svg viewBox="-52 -52 104 104" in:fade><Face face={faceById.get(p.id)!} r={50} /></svg>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if game.phase === 'reward'}
    <div class="reward" in:scale={{ duration: 600, easing: backOut }} out:fade={{ duration: 300 }}>
      <svg viewBox="-120 -120 240 240">
        {#each Array.from({ length: 10 }, (_, i) => i) as i (i)}
          <path
            class="star"
            style="--a: {i * 36}deg; --d: {i * 0.08}s"
            d="M0,-12 L3.5,-4 L12,-3.5 L5.5,2.5 L7.5,11 L0,6.5 L-7.5,11 L-5.5,2.5 L-12,-3.5 L-3.5,-4Z"
            fill="#ffd93d"
          />
        {/each}
        <circle r="78" fill="#ffffff" />
        <Face face={reward} r={72} pilot={reward === pilot} />
      </svg>
    </div>
  {/if}

  {#if game.phase === 'goodnight'}
    <div class="zzz" in:fade={{ duration: 1200 }} aria-hidden="true">💤</div>
  {/if}

  {#each puffs as p (p.id)}
    <div class="puff" style="left: {p.x}px; top: {p.y}px" aria-hidden="true"></div>
  {/each}

  <button class="parents" aria-label="Eltern-Bereich" onpointerdown={parentsButton}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm8.6 4.9-1.7 1.3.2 2.1-1.9 1.9-2.1-.2-1.3 1.7h-2.6l-1.3-1.7-2.1.2-1.9-1.9.2-2.1-1.7-1.3v-2.8l1.7-1.3-.2-2.1 1.9-1.9 2.1.2 1.3-1.7h2.6l1.3 1.7 2.1-.2 1.9 1.9-.2 2.1 1.7 1.3Z"
      />
    </svg>
  </button>
</div>

<style>
  .stage {
    position: fixed;
    inset: 0;
    overflow: hidden;
    touch-action: manipulation;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }

  /* Querformat: Gate links, Flugzeug rechts auf der Piste */
  .plane-area {
    position: absolute;
    left: 30%;
    right: 2%;
    top: 10%;
    bottom: 3%;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    container-type: size;
  }
  .gate {
    position: absolute;
    left: 2%;
    top: 50%;
    transform: translateY(-50%);
    width: 26%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2vmin;
    padding: 2.5vmin;
    border-radius: 4vmin;
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    transition: opacity 0.3s;
  }
  .gate.dim {
    opacity: 0.6;
  }
  .front {
    display: flex;
    flex-direction: column;
    gap: 2vmin;
  }
  .guest {
    width: min(22vmin, 20vw);
    aspect-ratio: 1;
    padding: 0;
    border: none;
    background: none;
    border-radius: 50%;
    cursor: pointer;
    filter: drop-shadow(0 1vmin 1.2vmin rgba(0, 0, 0, 0.2));
  }
  .guest svg,
  .behind svg {
    width: 100%;
    height: 100%;
    display: block;
  }
  .guest.hop {
    animation: hop 0.55s ease-in-out 3;
  }
  .behind {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 1vmin;
    max-width: 100%;
  }
  .behind svg {
    width: 7vmin;
    height: 7vmin;
    opacity: 0.85;
  }

  /* Hochformat: Flugzeug unten auf der Piste, Gate darüber */
  @media (orientation: portrait) {
    .plane-area {
      left: 3%;
      right: 3%;
      top: 48%;
      bottom: 3%;
    }
    .gate {
      left: 4%;
      right: 4%;
      top: auto;
      bottom: 30%;
      width: auto;
      transform: none;
    }
    .front {
      flex-direction: row;
    }
    .guest {
      width: min(26vw, 20vh);
    }
  }

  .plane-wrap {
    width: min(100cqw, calc(100cqh * var(--ratio)));
    aspect-ratio: var(--ratio);
    cursor: pointer;
  }
  .plane-wrap.arriving {
    animation: arrive var(--arrive) cubic-bezier(0.2, 0.7, 0.3, 1) both;
  }
  .plane-wrap.departing {
    animation: depart var(--depart) cubic-bezier(0.55, 0, 0.8, 0.6) forwards;
  }
  .plane-wrap.wiggle {
    animation: wiggle 0.5s ease-in-out;
  }

  .reward {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
  }
  .reward svg {
    width: min(80vmin, 90vw);
    height: min(80vmin, 90vw);
    overflow: visible;
  }
  .reward .star {
    transform-origin: 0 0;
    transform: rotate(var(--a)) translateY(-100px) scale(1.4);
    animation: burst 1.6s ease-out var(--d) infinite;
  }

  .zzz {
    position: absolute;
    top: 14%;
    left: 50%;
    transform: translateX(-50%);
    font-size: 14vmin;
    animation: float 3s ease-in-out infinite alternate;
  }

  .puff {
    position: fixed;
    width: 9vmin;
    height: 9vmin;
    margin: -4.5vmin 0 0 -4.5vmin;
    border-radius: 50%;
    background: radial-gradient(circle, #fff 40%, rgba(255, 255, 255, 0) 70%);
    pointer-events: none;
    animation: puff 0.9s ease-out forwards;
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

  @keyframes arrive {
    from {
      transform: translateX(110vw);
    }
    to {
      transform: translateX(0);
    }
  }
  @keyframes depart {
    0% {
      transform: translate(0, 0) rotate(0);
    }
    35% {
      transform: translate(-25vw, 0) rotate(0);
    }
    55% {
      transform: translate(-45vw, -6vh) rotate(8deg);
    }
    100% {
      transform: translate(-130vw, -80vh) rotate(14deg);
    }
  }
  @keyframes wiggle {
    25% {
      transform: rotate(-2deg);
    }
    75% {
      transform: rotate(2deg);
    }
  }
  @keyframes hop {
    50% {
      transform: translateY(-3vmin) scale(1.06);
    }
  }
  @keyframes burst {
    0% {
      opacity: 0;
      transform: rotate(var(--a)) translateY(-80px) scale(0.6);
    }
    30% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: rotate(var(--a)) translateY(-118px) scale(1.4);
    }
  }
  @keyframes float {
    to {
      transform: translate(-50%, -2vmin);
    }
  }
  @keyframes puff {
    from {
      transform: scale(0.3);
      opacity: 0.9;
    }
    to {
      transform: scale(1.6);
      opacity: 0;
    }
  }
</style>
