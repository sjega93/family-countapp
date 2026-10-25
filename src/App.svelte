<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { User } from 'firebase/auth';
  import GameScreen from './ui/game/GameScreen.svelte';
  import StartScreen from './ui/game/StartScreen.svelte';
  import ParentGate from './ui/parents/ParentGate.svelte';
  import ParentsScreen from './ui/parents/ParentsScreen.svelte';
  import { DEMO_PASSENGERS, DEMO_PILOT, type FaceInfo } from './ui/faces';
  import type { Session } from './ui/session';
  import { DEFAULT_SETTINGS, requiredPassengerPhotos, type GameSettings } from './logic/settings';
  import { buildCast } from './logic/cast';
  import { unlockSounds } from './services/audio/sounds';
  import { unlockSpeech } from './services/audio/voice';
  import {
    errorMessage,
    isConfigured,
    loadFamily,
    releasePhotos,
    saveSettings,
    watchUser,
  } from './services/data/family';

  type Screen = 'start' | 'game' | 'gate' | 'parents';

  let screen = $state<Screen>('start');
  let session = $state<Session>(isConfigured() ? { kind: 'signed-out' } : { kind: 'demo' });
  /** Bis Firebase die gespeicherte Anmeldung geprüft hat, wird noch nichts gestartet. */
  let authKnown = $state(!isConfigured());
  let settings = $state<GameSettings>(DEFAULT_SETTINGS);
  /** Zählt bei jedem Neustart hoch, damit das Spiel frisch beginnt. */
  let gameRun = $state(0);
  let loadToken = 0;

  async function load(user: User) {
    const token = ++loadToken;
    const previous = session.kind === 'ready' ? session.family.photos : [];
    session = { kind: 'loading', user };
    try {
      const family = await loadFamily(user.uid);
      if (token !== loadToken) return releasePhotos(family.photos);
      settings = family.settings;
      session = { kind: 'ready', user, family };
    } catch (e) {
      if (token !== loadToken) return;
      session = { kind: 'error', user, message: errorMessage(e) };
    } finally {
      // Alte Blob-URLs erst freigeben, wenn sie nicht mehr angezeigt werden.
      releasePhotos(previous);
    }
  }

  const stopAuth = watchUser((user) => {
    authKnown = true;
    if (user) {
      void load(user);
    } else {
      loadToken++;
      if (session.kind === 'ready') releasePhotos(session.family.photos);
      if (isConfigured()) session = { kind: 'signed-out' };
    }
  });
  onDestroy(stopAuth);

  /** Familienfotos als Gesichter fürs Spiel; fehlende Passagiere werden mit Platzhaltern aufgefüllt. */
  const cast = $derived.by(() => {
    const photos: (FaceInfo & { role?: 'pilot' | 'passenger' | 'reward' })[] =
      session.kind === 'ready'
        ? session.family.photos.map((p, i) => ({ id: p.id, name: p.name, imageUrl: p.url, variant: i, role: p.role }))
        : [];
    return buildCast<FaceInfo>(photos, requiredPassengerPhotos(settings), DEMO_PILOT, DEMO_PASSENGERS);
  });

  const waiting = $derived(!authKnown || session.kind === 'loading');
  const offline = $derived(session.kind === 'error');

  function start() {
    if (waiting) return;
    if (session.kind === 'error') {
      void load(session.user);
      return;
    }
    // Muss direkt in der Berührung passieren, sonst bleibt Safari stumm.
    unlockSounds();
    unlockSpeech();
    gameRun++;
    screen = 'game';
  }

  async function saveFromParents(s: GameSettings) {
    if (session.kind === 'ready') {
      await saveSettings(session.family.familyId, s);
    }
    settings = s;
    await closeParents();
  }

  /** Nach dem Eltern-Bereich frisch laden, damit neue Fotos sofort mitspielen. */
  async function closeParents() {
    if (session.kind === 'ready') await load(session.user);
    screen = 'start';
  }

  function retry() {
    if (session.kind === 'error') void load(session.user);
  }
</script>

{#if screen === 'start'}
  <StartScreen pilot={cast.pilot} {waiting} {offline} onStart={start} onParents={() => (screen = 'gate')} />
{:else if screen === 'game'}
  {#key gameRun}
    <GameScreen
      {settings}
      pilot={cast.pilot}
      passengers={cast.passengers}
      rewards={cast.rewards}
      onParents={() => (screen = 'gate')}
    />
  {/key}
{:else if screen === 'gate'}
  <ParentGate onPass={() => (screen = 'parents')} onCancel={() => (screen = 'start')} />
{:else}
  <ParentsScreen {session} {settings} onSave={saveFromParents} onRetry={retry} onClose={closeParents} />
{/if}
