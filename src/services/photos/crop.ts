/**
 * Rechnerei für den runden Zuschnitt: reine Funktionen, ohne Canvas, damit testbar.
 * Ein Zuschnitt ist ein Quadrat im Originalbild (x, y = linke obere Ecke, size = Kantenlänge).
 */

export interface Size {
  width: number;
  height: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Crop {
  x: number;
  y: number;
  size: number;
}

/** Wie viel Rand um das erkannte Gesicht bleibt (Haare, Kinn, etwas Schulter). */
const FACE_MARGIN = 1.7;
/** Kleinster erlaubter Ausschnitt relativ zur kürzeren Bildseite (stärkster Zoom). */
const MIN_FRACTION = 0.15;

/** Größter mögliches Quadrat, mittig. Ausgangspunkt, wenn kein Gesicht gefunden wurde. */
export function centerCrop(img: Size): Crop {
  const size = Math.min(img.width, img.height);
  return { x: (img.width - size) / 2, y: (img.height - size) / 2, size };
}

/** Quadrat um das erkannte Gesicht, leicht nach oben versetzt, damit die Haare Platz haben. */
export function cropAroundFace(img: Size, face: Box): Crop {
  const size = Math.max(face.width, face.height) * FACE_MARGIN;
  const cx = face.x + face.width / 2;
  const cy = face.y + face.height / 2 - face.height * 0.08;
  return clampCrop(img, { x: cx - size / 2, y: cy - size / 2, size });
}

/** Hält den Zuschnitt innerhalb des Bildes und zwischen kleinstem und größtem Ausschnitt. */
export function clampCrop(img: Size, crop: Crop): Crop {
  const maxSize = Math.min(img.width, img.height);
  const minSize = maxSize * MIN_FRACTION;
  const size = Math.min(maxSize, Math.max(minSize, crop.size));
  const x = Math.min(img.width - size, Math.max(0, crop.x));
  const y = Math.min(img.height - size, Math.max(0, crop.y));
  return { x, y, size };
}

/** Zoomt um den Mittelpunkt des Ausschnitts. factor > 1 = näher heran. */
export function zoomCrop(img: Size, crop: Crop, factor: number): Crop {
  const cx = crop.x + crop.size / 2;
  const cy = crop.y + crop.size / 2;
  const size = crop.size / factor;
  return clampCrop(img, { x: cx - size / 2, y: cy - size / 2, size });
}

/**
 * Verschiebt den Ausschnitt. dx/dy sind Bildschirm-Pixel im Vorschaukreis mit Kantenlänge viewSize;
 * Ziehen nach rechts zeigt mehr vom linken Bildteil, wie man es von Foto-Apps kennt.
 */
export function panCrop(img: Size, crop: Crop, dx: number, dy: number, viewSize: number): Crop {
  const scale = crop.size / viewSize;
  return clampCrop(img, { ...crop, x: crop.x - dx * scale, y: crop.y - dy * scale });
}

/** Wie stark gezoomt ist: 0 = ganzes Bild, 1 = maximal heran. Für den Schieberegler. */
export function zoomLevel(img: Size, crop: Crop): number {
  const maxSize = Math.min(img.width, img.height);
  const minSize = maxSize * MIN_FRACTION;
  return (maxSize - crop.size) / (maxSize - minSize);
}

export function cropForZoomLevel(img: Size, crop: Crop, level: number): Crop {
  const maxSize = Math.min(img.width, img.height);
  const minSize = maxSize * MIN_FRACTION;
  const size = maxSize - Math.min(1, Math.max(0, level)) * (maxSize - minSize);
  return zoomCrop(img, crop, crop.size / size);
}
