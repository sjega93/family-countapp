<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { PhotoRole } from '../../logic/cast';
  import {
    addPhoto,
    deletePhoto,
    errorMessage,
    updatePhoto,
    watchPhotos,
    type FamilyPhoto,
  } from '../../services/data/family';
  import PhotoEditor from './PhotoEditor.svelte';

  interface Props {
    familyId: string;
    /** Wie viele Passagierfotos die aktuellen Einstellungen brauchen. */
    neededPassengers: number;
    onCountChange?: (passengers: number) => void;
  }

  let { familyId, neededPassengers, onCountChange }: Props = $props();

  let photos = $state<FamilyPhoto[]>([]);
  let loaded = $state(false);
  let error = $state('');
  let queue = $state<File[]>([]);
  let queueTotal = $state(0);
  let editing = $state<FamilyPhoto | null>(null);
  let editRole = $state<PhotoRole>('passenger');
  let editName = $state('');
  let busy = $state(false);

  // svelte-ignore state_referenced_locally
  const stop = watchPhotos(
    familyId,
    (p) => {
      photos = p;
      loaded = true;
      error = '';
      onCountChange?.(p.filter((x) => x.role === 'passenger').length);
    },
    (e) => (error = errorMessage(e)),
  );
  onDestroy(stop);

  const pilot = $derived(photos.filter((p) => p.role === 'pilot'));
  const passengers = $derived(photos.filter((p) => p.role === 'passenger'));
  const rewards = $derived(photos.filter((p) => p.role === 'reward'));
  const groups = $derived([
    { title: 'Pilot', hint: 'Euer Kind im Cockpit', items: pilot },
    { title: `Passagiere (${passengers.length})`, hint: 'Steigen ein und werden gezählt', items: passengers },
    { title: 'Belohnung', hint: 'Erscheint nach jeder Runde', items: rewards },
  ]);

  function pick(e: Event & { currentTarget: HTMLInputElement }) {
    const files = Array.from(e.currentTarget.files ?? []);
    e.currentTarget.value = '';
    if (!files.length) return;
    queue = files;
    queueTotal = files.length;
  }

  function nextInQueue() {
    queue = queue.slice(1);
  }

  async function saveNew(blob: Blob, role: PhotoRole, name: string) {
    await addPhoto(familyId, blob, role, name || undefined);
    nextInQueue();
  }

  function openEdit(p: FamilyPhoto) {
    editing = p;
    editRole = p.role;
    editName = p.name ?? '';
  }

  async function saveEdit() {
    if (!editing) return;
    busy = true;
    try {
      await updatePhoto(familyId, editing.id, editRole, editName.trim() || undefined);
      editing = null;
    } catch (e) {
      error = errorMessage(e);
    } finally {
      busy = false;
    }
  }

  async function remove() {
    if (!editing || !confirm('Dieses Foto wirklich löschen?')) return;
    busy = true;
    try {
      await deletePhoto(familyId, editing.id);
      editing = null;
    } catch (e) {
      error = errorMessage(e);
    } finally {
      busy = false;
    }
  }

  const ROLES: { value: PhotoRole; label: string }[] = [
    { value: 'passenger', label: 'Passagier' },
    { value: 'pilot', label: 'Pilot' },
    { value: 'reward', label: 'Belohnung' },
  ];
</script>

<section>
  <h2>Fotos</h2>

  {#if !loaded && !error}
    <p class="muted">Fotos werden geladen …</p>
  {/if}
  {#if error}
    <p class="warn">{error}</p>
  {/if}

  {#if loaded}
    {#each groups as g (g.title)}
      <div class="group">
        <div class="group-head">
          <h3>{g.title}</h3>
          <span class="muted">{g.hint}</span>
        </div>
        {#if g.items.length}
          <div class="grid">
            {#each g.items as p (p.id)}
              <button class="thumb" onclick={() => openEdit(p)} aria-label="Foto bearbeiten{p.name ? `: ${p.name}` : ''}">
                <img src={p.url} alt="" />
                {#if p.name}<span>{p.name}</span>{/if}
              </button>
            {/each}
          </div>
        {:else}
          <p class="muted small">Noch keins.</p>
        {/if}
      </div>
    {/each}

    {#if passengers.length < neededPassengers}
      <p class="info">
        Für die eingestellten Flüge braucht es {neededPassengers} Passagierfotos. Bis dahin füllt das Spiel mit
        gezeichneten Gesichtern auf.
      </p>
    {/if}
  {/if}

  <label class="add">
    <input type="file" accept="image/*" multiple onchange={pick} />
    Fotos hinzufügen
  </label>
  <p class="muted small">
    Die Fotos werden auf diesem Gerät zugeschnitten und verkleinert. Versteckte Infos wie der Aufnahmeort werden
    dabei entfernt.
  </p>
</section>

{#if queue.length}
  {#key queue[0]}
    <PhotoEditor
      file={queue[0]}
      progress={queueTotal > 1 ? `Foto ${queueTotal - queue.length + 1} von ${queueTotal}` : undefined}
      defaultRole={pilot.length ? 'passenger' : 'pilot'}
      onSave={saveNew}
      onSkip={nextInQueue}
      onCancel={() => (queue = [])}
    />
  {/key}
{/if}

{#if editing}
  <div class="sheet-backdrop" role="presentation" onclick={() => !busy && (editing = null)}></div>
  <div class="sheet" role="dialog" aria-label="Foto bearbeiten">
    <img src={editing.url} alt="" />
    <div class="roles">
      {#each ROLES as r (r.value)}
        <button class="chip" class:active={editRole === r.value} onclick={() => (editRole = r.value)}>{r.label}</button>
      {/each}
    </div>
    <label class="name">
      <span>Name (optional)</span>
      <input type="text" maxlength="30" bind:value={editName} autocomplete="off" />
    </label>
    <div class="actions">
      <button class="danger" onclick={remove} disabled={busy}>Löschen</button>
      <button class="primary" onclick={saveEdit} disabled={busy}>Speichern</button>
    </div>
  </div>
{/if}

<style>
  section {
    background: #fff;
    border-radius: 14px;
    padding: 14px 16px;
    max-width: 560px;
    margin: 0 auto 16px;
  }
  h2 {
    font-size: 15px;
    font-weight: 600;
    color: #4b5563;
    margin: 0 0 8px;
  }
  h3 {
    font-size: 15px;
    margin: 0;
  }
  .group {
    padding: 8px 0;
    border-top: 1px solid #f0ede6;
  }
  .group:first-of-type {
    border-top: none;
  }
  .group-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
    gap: 10px;
  }
  .thumb {
    border: none;
    background: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #374151;
  }
  .thumb img {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: 0 0 0 2px #fff, 0 0 0 3px #e5e7eb;
  }
  .muted {
    color: #6b7280;
    font-size: 13px;
  }
  .small {
    font-size: 12px;
    margin: 4px 0 0;
  }
  .warn {
    color: #b91c1c;
    font-size: 14px;
  }
  .info {
    font-size: 13px;
    color: #6b4e16;
    background: #fdf2d0;
    border-radius: 10px;
    padding: 8px 12px;
  }
  .add {
    display: block;
    margin-top: 12px;
    text-align: center;
    padding: 12px;
    border-radius: 12px;
    border: 2px dashed #9ca3af;
    color: #1f3a5f;
    font-weight: 600;
    cursor: pointer;
  }
  .add input {
    display: none;
  }
  .sheet-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: 5;
  }
  .sheet {
    position: fixed;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    width: min(100%, 480px);
    z-index: 6;
    background: #fff;
    border-radius: 18px 18px 0 0;
    padding: 18px 16px max(18px, env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .sheet img {
    width: 120px;
    height: 120px;
    border-radius: 50%;
  }
  .roles {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
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
  .name {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 14px;
    color: #4b5563;
  }
  .name input {
    font-size: 16px;
    padding: 10px 12px;
    border: 1px solid #d1d5db;
    border-radius: 10px;
  }
  .actions {
    width: 100%;
    display: flex;
    gap: 10px;
  }
  .actions button {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
  }
  .primary {
    border: none;
    background: #1f3a5f;
    color: #fff;
  }
  .danger {
    border: 1px solid #fca5a5;
    background: #fff;
    color: #b91c1c;
  }
  button:disabled {
    opacity: 0.5;
  }
</style>
