/**
 * Fotos auf dem Gerät verarbeiten: laden, Gesicht finden, zuschneiden, klein speichern.
 * Nichts davon verlässt das Gerät, bevor das fertige 512×512-Bild hochgeladen wird.
 */

import { centerCrop, cropAroundFace, type Box, type Crop, type Size } from './crop';

export const OUTPUT_SIZE = 512;
/** Obergrenze laut Firestore-Regeln (300 KB); mit Abstand darunter bleiben. */
const MAX_BYTES = 280 * 1024;

export interface LoadedImage {
  /** Bild mit korrekter Ausrichtung (EXIF-Drehung wird vom Browser angewendet). */
  image: HTMLImageElement;
  size: Size;
  /** Blob-URL für die Vorschau; nach Gebrauch mit release() freigeben. */
  url: string;
}

/** Lädt eine Datei aus der Galerie. Safari auf dem iPhone kann dabei auch HEIC lesen. */
export async function loadImage(file: Blob): Promise<LoadedImage> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = url;
  try {
    await image.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error('Dieses Bildformat kann auf diesem Gerät nicht gelesen werden.');
  }
  return { image, size: { width: image.naturalWidth, height: image.naturalHeight }, url };
}

export function release(img: LoadedImage): void {
  URL.revokeObjectURL(img.url);
}

type FaceApi = typeof import('@vladmandic/face-api');
let faceApi: Promise<FaceApi> | null = null;

/** Lädt die Gesichtserkennung erst bei Bedarf (nur im Eltern-Bereich). */
function loadFaceApi(): Promise<FaceApi> {
  faceApi ??= (async () => {
    const api = await import('@vladmandic/face-api');
    // tf.ready ist zur Laufzeit vorhanden, fehlt aber in den Typen der Bibliothek.
    await (api.tf as unknown as { ready?: () => Promise<void> }).ready?.();
    await api.nets.tinyFaceDetector.loadFromUri('/models');
    return api;
  })();
  return faceApi;
}

/** Sucht das größte Gesicht im Bild. Gibt null zurück, wenn keins gefunden wird oder etwas schiefgeht. */
export async function detectFace(img: LoadedImage): Promise<Box | null> {
  try {
    const api = await loadFaceApi();
    // Für die Erkennung verkleinern: schneller und auf dem Handy speicherschonend.
    const scale = Math.min(1, 640 / Math.max(img.size.width, img.size.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.size.width * scale);
    canvas.height = Math.round(img.size.height * scale);
    canvas.getContext('2d')!.drawImage(img.image, 0, 0, canvas.width, canvas.height);
    const faces = await api.detectAllFaces(canvas, new api.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }));
    if (!faces.length) return null;
    const best = faces.reduce((a, b) => (b.box.area > a.box.area ? b : a));
    return {
      x: best.box.x / scale,
      y: best.box.y / scale,
      width: best.box.width / scale,
      height: best.box.height / scale,
    };
  } catch (e) {
    console.warn('Gesichtserkennung nicht verfügbar', e);
    return null;
  }
}

/** Startausschnitt: um das Gesicht, sonst die Bildmitte. */
export async function suggestCrop(img: LoadedImage): Promise<{ crop: Crop; faceFound: boolean }> {
  const face = await detectFace(img);
  return face ? { crop: cropAroundFace(img.size, face), faceFound: true } : { crop: centerCrop(img.size), faceFound: false };
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Schneidet aus und speichert als 512×512. Bevorzugt WebP; kann das Gerät kein WebP erzeugen
 * (ältere Safari-Versionen), wird JPEG verwendet. Beim Neuzeichnen fallen alle versteckten
 * Foto-Infos wie GPS-Ort und Aufnahmedatum weg.
 */
export async function renderCrop(img: LoadedImage, crop: Crop): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img.image, crop.x, crop.y, crop.size, crop.size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  for (const quality of [0.85, 0.7, 0.55]) {
    const webp = await toBlob(canvas, 'image/webp', quality);
    const blob = webp?.type === 'image/webp' ? webp : await toBlob(canvas, 'image/jpeg', quality);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error('Das Foto ist zu groß geworden. Bitte etwas weiter herauszoomen.');
}
