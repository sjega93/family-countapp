<script lang="ts">
  import GameScreen from './ui/game/GameScreen.svelte';
  import StartScreen from './ui/game/StartScreen.svelte';
  import ParentGate from './ui/parents/ParentGate.svelte';
  import ParentsScreen from './ui/parents/ParentsScreen.svelte';
  import { DEMO_PASSENGERS, DEMO_PILOT } from './ui/faces';
  import { DEFAULT_SETTINGS, type GameSettings } from './logic/settings';
  import { unlockSounds } from './services/audio/sounds';
  import { unlockSpeech } from './services/audio/voice';

  type Screen = 'start' | 'game' | 'gate' | 'parents';

  let screen = $state<Screen>('start');
  let settings = $state<GameSettings>(DEFAULT_SETTINGS);
  /** Zählt bei jedem Neustart hoch, damit das Spiel frisch beginnt. */
  let gameRun = $state(0);

  // Etappe 1: Demo-Daten. Ab Etappe 3 kommen Pilot, Passagiere und Belohnungen aus der Cloud.
  const pilot = DEMO_PILOT;
  const passengers = DEMO_PASSENGERS;
  const rewards = [DEMO_PILOT];

  function start() {
    // Muss direkt in der Berührung passieren, sonst bleibt Safari stumm.
    unlockSounds();
    unlockSpeech();
    screen = 'game';
  }

  function saveSettings(s: GameSettings) {
    settings = s;
    gameRun++;
    screen = 'game';
  }
</script>

{#if screen === 'start'}
  <StartScreen {pilot} onStart={start} />
{:else if screen === 'game'}
  {#key gameRun}
    <GameScreen {settings} {pilot} {passengers} {rewards} onParents={() => (screen = 'gate')} />
  {/key}
{:else if screen === 'gate'}
  <ParentGate onPass={() => (screen = 'parents')} onCancel={() => (screen = 'game')} />
{:else}
  <ParentsScreen
    {settings}
    availablePhotos={passengers.length}
    demoMode={true}
    onSave={saveSettings}
    onClose={() => (screen = 'game')}
  />
{/if}
