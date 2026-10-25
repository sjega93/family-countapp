/**
 * Wie ein Gesicht dargestellt wird: echtes Foto (ab Etappe 3) oder gezeichnetes Platzhalter-Gesicht.
 */

import type { Person } from '../logic/game';

export interface FaceInfo extends Person {
  /** Blob-URL des zugeschnittenen Fotos; fehlt im Demo-Modus. */
  imageUrl?: string;
  /** Variante des gezeichneten Platzhalter-Gesichts. */
  variant: number;
}

export const DEMO_PILOT: FaceInfo = { id: 'demo-pilot', variant: 0 };

export const DEMO_PASSENGERS: FaceInfo[] = Array.from({ length: 10 }, (_, i) => ({
  id: `demo-${i + 1}`,
  variant: i + 1,
}));
