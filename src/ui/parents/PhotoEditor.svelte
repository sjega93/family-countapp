<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { PhotoRole } from '../../logic/cast';
  import {
    cropForZoomLevel,
    panCrop,
    zoomCrop,
    zoomLevel,
    type Crop,
  } from '../../services/photos/crop';
  import { loadImage, release, renderCrop, suggestCrop, type LoadedImage } from '../../services/photos/process';

  interface Props {
    file: File;
    /** z. B. „Foto 2 von 5“ */
    progress?: string;
    defaultRole: PhotoRole;
    onSave: (blob: Blob, role: PhotoRole, name: string) => Promise<void>;
    onSkip: () => void;
    onCancel: () => void;
  }

  let { file, progress, defaultRole, onSave, onSkip, onCancel }: Props = $props();

  let img = $state<LoadedImage | null>(null);
  let crop = $state<Crop | null>(null);
  let faceFound = $state(false);
  let status = $state<'loading' | 'ready' | 'saving' | 'error'>('loading');
  let error = $state('');
  // svelte-ignore state_referenced_locally
  let role = $state<PhotoRole>(defaultRole);
  let name = $state('');
  let viewSize = $state(300);

  const ROLES: { value: PhotoRole; label: string }[] = [
    { value: 'passenger', label: 'Passagier' },
    { value: 'pilot', label: 'Pilot' },
    { value: 'reward', label: 'Belohnung' },
  ];

  $effect(() => {
    const f = file;
    let cancelled = false;
    status = 'loading';
    error = '';
    (async () => {
      try {
        const loaded = await loadImage(f);
        if (cancelled) return release(loaded);
        img = loaded;
        const s = await suggestCrop(loaded);
        if (cancelled) return;
        crop = s.crop;
        faceFound = s.faceFound;
        status = 'ready';
      } catch (e) {
        if (cancelled) return;
        error = e instanceof Error ? e.message : String(e);
        status = 'error';
      }
    })();
    return () => {
      cancelled = true;
      if (img) release(img);
      img = null;
      crop = null;
    };
  });

  onDestroy(() => {
    if (img) release(img);
  });

  const scale = $derived(img && crop ? viewSize / crop.size : 1);
  const zoom = $derived(img && crop ? zoomLevel(img.size, crop) : 0);

  // Ziehen und Zwei-Finger-Zoom
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchStart = 0;

  function down(e: PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) pinchStart = distance();
  }

  function move(e: PointerEvent) {
    const prev = pointers.get(e.pointerId);
    if (!prev || !img || !crop) return;
    const next = { x: e.clientX, y: e.clientY };
    if (pointers.size === 1) {
      crop = panCrop(img.size, crop, next.x - prev.x, next.y - prev.y, viewSize);
      pointers.set(e.pointerId, next);
    } else if (pointers.size === 2) {
      pointers.set(e.pointerId, next);
      const d = distance();
      if (pinchStart > 0) crop = zoomCrop(img.size, crop, d / pinchStart);
      pinchStart = d;
    }
  }

  function up(e: PointerEvent) {
    pointers.delete(e.pointerId);
    pinchStart = pointers.size === 2 ? distance() : 0;
  }

  function distance() {
    const [a, b] = [...pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function setZoom(level: number) {
    if (img && crop) crop = cropForZoomLevel(img.size, crop, level);
  }

  async function save() {
    if (!img || !crop) return;
    status = 'saving';
    error = '';
    try {
      const blob = await renderCrop(img, crop);
      await onSave(blob, role, name.trim());
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = 'ready';
    }
  }
</script>

<div class="editor" role="dialog" aria-label="Foto zuschneiden">
  <header>
    <button class="link" onclick={onCancel}>Abbrechen</button>
    <span class="progress">{progress ?? ''}</span>
    <button class="link" onclick={onSkip} disabled={status === 'saving'}>Überspringen</button>
  </header>

  <div class="view" bind:clientWidth={viewSize}>
    {#if img && crop}
      <img
        src={img.url}
        alt=""
        draggable="false"
        style="width: {img.size.width * scale}px; height: {img.size.height * scale}px; transform: translate({-crop.x *
          scale}px, {-crop.y * scale}px)"
      />
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="mask"
        onpointerdown={down}
        onpointermove={move}
        onpointerup={up}
        onpointercancel={up}
      ></div>
    {:else if status === 'loading'}
      <p class="hint">Gesicht wird gesucht …</p>
    {/if}
  </div>

  {#if status === 'error'}
    <p class="error">{error}</p>
  {:else}
    <p class="hint">
      {#if status === 'loading'}
        &nbsp;
      {:else if faceFound}
        Gesicht gefunden. Mit einem Finger verschieben, mit zwei Fingern oder dem Regler zoomen.
      {:else}
        Kein Gesicht erkannt. Bitte das Gesicht in den Kreis schieben.
      {/if}
    </p>
  {/if}

  <label class="zoom">
    <span>Zoom</span>
    <input
      type="range"
      min="0"
      max="1"
      step="0.01"
      value={zoom}
      disabled={status !== 'ready'}
      oninput={(e) => setZoom(Number(e.currentTarget.value))}
    />
  </label>

  <fieldset class="roles">
    <legend>Rolle im Spiel</legend>
    {#each ROLES as r (r.value)}
      <button class="chip" class:active={role === r.value} onclick={() => (role = r.value)}>{r.label}</button>
    {/each}
  </fieldset>

  <label class="name">
    <span>Name (optional, z. B. „Mama“)</span>
    <input type="text" maxlength="30" bind:value={name} autocomplete="off" />
  </label>

  {#if error && status !== 'error'}
    <p class="error">{error}</p>
  {/if}

  <button class="primary" onclick={save} disabled={status !== 'ready'}>
    {status === 'saving' ? 'Wird gespeichert …' : 'Speichern'}
  </button>
</div>

<style>
  .editor {
    position: fixed;
    inset: 0;
    z-index: 10;
    overflow-y: auto;
    background: #f4f1ea;
    color: #1f2937;
    font-family: system-ui, -apple-system, sans-serif;
    padding: max(12px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  header {
    width: 100%;
    max-width: 480px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .progress {
    font-size: 14px;
    color: #6b7280;
  }
  .view {
    position: relative;
    width: min(86vw, 52vh, 420px);
    aspect-ratio: 1;
    overflow: hidden;
    background: #d9d4c7;
    border-radius: 12px;
    touch-action: none;
    display: grid;
    place-items: center;
  }
  .view img {
    position: absolute;
    left: 0;
    top: 0;
    max-width: none;
    transform-origin: 0 0;
    user-select: none;
    -webkit-user-select: none;
    pointer-events: none;
  }
  .mask {
    position: absolute;
    inset: 0;
    border-radius: 12px;
    background: radial-gradient(circle closest-side, transparent 0 99%, rgba(244, 241, 234, 0.75) 100%);
    cursor: grab;
  }
  .mask::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.15);
  }
  .hint {
    margin: 0;
    font-size: 14px;
    color: #4b5563;
    text-align: center;
    max-width: 420px;
  }
  .error {
    margin: 0;
    font-size: 14px;
    color: #b91c1c;
    text-align: center;
  }
  .zoom,
  .name,
  .roles {
    width: 100%;
    max-width: 420px;
  }
  .zoom {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
  }
  .zoom input {
    flex: 1;
  }
  .roles {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .roles legend {
    font-size: 14px;
    color: #4b5563;
    margin-bottom: 6px;
  }
  .name {
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
    background: #fff;
    color: #1f2937;
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
    width: 100%;
    max-width: 420px;
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
    padding: 8px 0;
  }
  .link:disabled {
    opacity: 0.4;
  }
</style>
