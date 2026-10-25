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
  import { errorMessage, login, logout, resetPassword } from '../../services/data/family';
  import type { Session } from '../session';
  import PhotosSection from './PhotosSection.svelte';

  interface Props {
    session: Session;
    settings: GameSettings;
    onSave: (s: GameSettings) => Promise<void>;
    onRetry: () => void;
    onClose: () => void;
  }

  let { session, settings, onSave, onRetry, onClose }: Props = $props();

  // svelte-ignore state_referenced_locally
  let draft = $state<GameSettings>({ ...settings, flights: settings.flights.slice() });
  const needed = $derived(requiredPassengerPhotos(draft));
  const LIMITS = [null, 5, 10, 15, 20, 30];

  let email = $state('');
  let password = $state('');
  let accountMsg = $state('');
  let accountBusy = $state(false);
  let saveMsg = $state('');
  let saving = $state(false);

  async function doLogin(e: SubmitEvent) {
    e.preventDefault();
    accountBusy = true;
    accountMsg = '';
    try {
      await login(email, password);
      password = '';
    } catch (err) {
      accountMsg = errorMessage(err);
    } finally {
      accountBusy = false;
    }
  }

  async function doReset() {
    if (!email.trim()) {
      accountMsg = 'Bitte zuerst die E-Mail-Adresse eingeben.';
      return;
    }
    try {
      await resetPassword(email);
      accountMsg = 'Falls das Konto existiert, ist eine E-Mail zum Zurücksetzen unterwegs.';
    } catch (err) {
      accountMsg = errorMessage(err);
    }
  }

  async function doLogout() {
    if (!confirm('Abmelden? Danach zeigt das Spiel auf diesem Gerät wieder Platzhalter-Gesichter.')) return;
    await logout();
  }

  async function save() {
    saving = true;
    saveMsg = '';
    try {
      await onSave(draft);
    } catch (err) {
      saveMsg = errorMessage(err);
    } finally {
      saving = false;
    }
  }
</script>

<div class="parents">
  <header>
    <h1>Eltern-Bereich</h1>
    <button class="link" onclick={onClose}>Zurück zum Spiel</button>
  </header>

  <section>
    <h2>Konto</h2>
    {#if session.kind === 'demo'}
      <p class="note">
        Demo-Modus: Diese Version ist nicht mit Firebase verbunden. Es werden gezeichnete Gesichter und die
        Gerätestimme verwendet.
      </p>
    {:else if session.kind === 'signed-out'}
      <p class="muted">Melde dich an, damit eure Fotos im Spiel erscheinen. Das Konto bleibt auf diesem Gerät angemeldet.</p>
      <form onsubmit={doLogin}>
        <label>
          <span>E-Mail</span>
          <input type="email" autocomplete="username" bind:value={email} required />
        </label>
        <label>
          <span>Passwort</span>
          <input type="password" autocomplete="current-password" bind:value={password} required />
        </label>
        <button class="primary" type="submit" disabled={accountBusy}>{accountBusy ? 'Anmelden …' : 'Anmelden'}</button>
        <button class="link" type="button" onclick={doReset}>Passwort vergessen?</button>
      </form>
    {:else}
      <div class="row">
        <span>Angemeldet als <strong>{session.user.email}</strong></span>
        <button class="link" onclick={doLogout}>Abmelden</button>
      </div>
      {#if session.kind === 'loading'}
        <p class="muted">Familie wird geladen …</p>
      {:else if session.kind === 'error'}
        <p class="warn">{session.message}</p>
        <button class="secondary" onclick={onRetry}>Erneut versuchen</button>
      {/if}
    {/if}
    {#if accountMsg}<p class="warn">{accountMsg}</p>{/if}
  </section>

  {#if session.kind === 'ready'}
    <PhotosSection familyId={session.family.familyId} neededPassengers={needed} />
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

  {#if session.kind !== 'ready'}
    <p class="muted center">Ohne Anmeldung gelten die Einstellungen nur, bis die App geschlossen wird.</p>
  {/if}
  {#if saveMsg}<p class="warn center">{saveMsg}</p>{/if}
  <button class="primary wide" disabled={saving} onclick={save}>
    {saving ? 'Wird gespeichert …' : 'Speichern und Spiel neu starten'}
  </button>
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
  .wide,
  .center {
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
    margin: 0;
  }
  .muted {
    color: #6b7280;
    font-size: 14px;
  }
  .center {
    text-align: center;
  }
  .warn {
    color: #b91c1c;
    font-size: 14px;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 14px;
    color: #4b5563;
  }
  form input {
    font-size: 16px;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    background: #fff;
    color: #1f2937;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
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
  .primary {
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
  .wide {
    display: block;
    width: 100%;
  }
  .secondary {
    padding: 10px 14px;
    border: 1px solid #1f3a5f;
    border-radius: 10px;
    background: #fff;
    color: #1f3a5f;
    font-size: 15px;
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
