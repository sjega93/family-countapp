<script lang="ts">
  import {
    MAX_FLIGHTS,
    MAX_GUESTS,
    MIN_FLIGHTS,
    MIN_GUESTS,
    requiredPassengerPhotos,
    withFlightCount,
    withGuests,
    type GameSettings,
  } from '../../logic/settings';

  interface Props {
    settings: GameSettings;
    availablePhotos: number;
    demoMode: boolean;
    onSave: (s: GameSettings) => void;
    onClose: () => void;
  }

  let { settings, availablePhotos, demoMode, onSave, onClose }: Props = $props();

  // svelte-ignore state_referenced_locally
  let draft = $state<GameSettings>({ ...settings, flights: settings.flights.slice() });
  const needed = $derived(requiredPassengerPhotos(draft));
  const enough = $derived(availablePhotos >= needed);
  const LIMITS = [null, 5, 10, 15, 20, 30];
</script>

<div class="parents">
  <header>
    <h1>Eltern-Bereich</h1>
    <button class="link" onclick={onClose}>Zurück zum Spiel</button>
  </header>

  {#if demoMode}
    <p class="note">
      Demo-Modus: Es werden gezeichnete Platzhalter-Gesichter und die Gerätestimme verwendet. Anmeldung, eure Fotos
      und Aufnahmen folgen in einer späteren Etappe. Einstellungen gelten nur, bis die App geschlossen wird.
    </p>
  {/if}

  <section>
    <h2>Flüge pro Runde</h2>
    <div class="stepper">
      <button
        aria-label="Weniger Flüge"
        disabled={draft.flights.length <= MIN_FLIGHTS}
        onclick={() => (draft = withFlightCount(draft, draft.flights.length - 1))}>−</button
      >
      <span class="value">{draft.flights.length}</span>
      <button
        aria-label="Mehr Flüge"
        disabled={draft.flights.length >= MAX_FLIGHTS}
        onclick={() => (draft = withFlightCount(draft, draft.flights.length + 1))}>+</button
      >
    </div>
  </section>

  <section>
    <h2>Gäste pro Flug</h2>
    {#each draft.flights as guests, i (i)}
      <div class="row">
        <span>Flug {i + 1}</span>
        <div class="stepper">
          <button
            aria-label="Weniger Gäste in Flug {i + 1}"
            disabled={guests <= MIN_GUESTS}
            onclick={() => (draft = withGuests(draft, i, guests - 1))}>−</button
          >
          <span class="value">{guests}</span>
          <button
            aria-label="Mehr Gäste in Flug {i + 1}"
            disabled={guests >= MAX_GUESTS}
            onclick={() => (draft = withGuests(draft, i, guests + 1))}>+</button
          >
        </div>
      </div>
    {/each}
    {#if !enough}
      <p class="warn">Für {needed} Gäste braucht es {needed} Passagierfotos, vorhanden sind {availablePhotos}.</p>
    {/if}
  </section>

  <section>
    <h2>Zeitlimit</h2>
    <div class="chips">
      {#each LIMITS as m (m)}
        <button
          class="chip"
          class:active={draft.timeLimitMinutes === m}
          onclick={() => (draft = { ...draft, timeLimitMinutes: m })}>{m === null ? 'Aus' : `${m} Min.`}</button
        >
      {/each}
    </div>
  </section>

  <button class="primary" disabled={!enough} onclick={() => onSave(draft)}>Speichern und Spiel neu starten</button>
</div>

<style>
  .parents {
    position: fixed;
    inset: 0;
    overflow-y: auto;
    background: #f4f1ea;
    color: #1f2937;
    font-family: system-ui, -apple-system, sans-serif;
    padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right))
      max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 560px;
    margin: 0 auto 8px;
  }
  h1 {
    font-size: 22px;
    margin: 0;
  }
  h2 {
    font-size: 15px;
    font-weight: 600;
    color: #4b5563;
    margin: 0 0 8px;
  }
  section,
  .note,
  .primary {
    max-width: 560px;
    margin: 0 auto 16px;
  }
  section {
    background: #fff;
    border-radius: 14px;
    padding: 14px 16px;
  }
  .note {
    font-size: 14px;
    color: #6b4e16;
    background: #fdf2d0;
    border-radius: 12px;
    padding: 10px 14px;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 0;
    border-top: 1px solid #f0ede6;
  }
  .row:first-of-type {
    border-top: none;
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .stepper button {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 1px solid #d1d5db;
    background: #fff;
    font-size: 22px;
    color: #1f2937;
  }
  .stepper button:disabled {
    opacity: 0.35;
  }
  .value {
    min-width: 2ch;
    text-align: center;
    font-size: 20px;
    font-weight: 600;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    border: 1px solid #d1d5db;
    background: #fff;
    border-radius: 999px;
    padding: 8px 14px;
    font-size: 15px;
    color: #1f2937;
  }
  .chip.active {
    background: #1f3a5f;
    border-color: #1f3a5f;
    color: #fff;
  }
  .warn {
    color: #b91c1c;
    font-size: 14px;
    margin: 8px 0 0;
  }
  .primary {
    display: block;
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 12px;
    background: #1f3a5f;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
  }
  .primary:disabled {
    opacity: 0.4;
  }
  .link {
    border: none;
    background: none;
    color: #1f3a5f;
    font-size: 15px;
    text-decoration: underline;
    padding: 8px 0;
  }
</style>
