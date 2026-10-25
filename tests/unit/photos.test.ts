import { describe, expect, it } from 'vitest';
import {
  centerCrop,
  clampCrop,
  cropAroundFace,
  cropForZoomLevel,
  panCrop,
  zoomCrop,
  zoomLevel,
} from '../../src/services/photos/crop';
import { buildCast } from '../../src/logic/cast';

const portrait = { width: 3000, height: 4000 };

function inside(c: { x: number; y: number; size: number }, img = portrait) {
  return c.x >= 0 && c.y >= 0 && c.x + c.size <= img.width + 1e-9 && c.y + c.size <= img.height + 1e-9;
}

describe('Zuschnitt', () => {
  it('ohne Gesicht: größtes Quadrat in der Mitte', () => {
    expect(centerCrop(portrait)).toEqual({ x: 0, y: 500, size: 3000 });
  });

  it('um das Gesicht herum, mit Rand, innerhalb des Bildes', () => {
    const c = cropAroundFace(portrait, { x: 1200, y: 1000, width: 600, height: 700 });
    expect(c.size).toBeCloseTo(700 * 1.7);
    expect(inside(c)).toBe(true);
    // Gesichtsmitte liegt im Ausschnitt, eher oberhalb der Mitte nicht abgeschnitten
    expect(c.x).toBeLessThan(1200);
    expect(c.x + c.size).toBeGreaterThan(1800);
  });

  it('Gesicht am Bildrand: Ausschnitt rutscht ins Bild', () => {
    const c = cropAroundFace(portrait, { x: 0, y: 0, width: 500, height: 500 });
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
    expect(inside(c)).toBe(true);
  });

  it('bleibt beim Verschieben im Bild', () => {
    const start = centerCrop(portrait);
    const c = panCrop(portrait, start, 5000, -5000, 300);
    expect(inside(c)).toBe(true);
  });

  it('Ziehen nach rechts zeigt mehr vom linken Bildteil', () => {
    const start = { x: 1000, y: 1000, size: 1000 };
    const c = panCrop(portrait, start, 30, 0, 300);
    expect(c.x).toBeLessThan(1000);
  });

  it('Zoom ist begrenzt und behält die Mitte', () => {
    const start = { x: 1000, y: 1000, size: 1000 };
    const c = zoomCrop(portrait, start, 2);
    expect(c.size).toBe(500);
    expect(c.x + c.size / 2).toBe(1500);
    expect(zoomCrop(portrait, start, 1000).size).toBeCloseTo(450);
    expect(zoomCrop(portrait, start, 0.001).size).toBe(3000);
  });

  it('Schieberegler und Zoomstufe passen zusammen', () => {
    const start = centerCrop(portrait);
    expect(zoomLevel(portrait, start)).toBe(0);
    const c = cropForZoomLevel(portrait, start, 0.5);
    expect(zoomLevel(portrait, c)).toBeCloseTo(0.5);
    expect(inside(c)).toBe(true);
  });

  it('korrigiert ungültige Werte', () => {
    expect(clampCrop(portrait, { x: -10, y: 99999, size: 99999 })).toEqual({ x: 0, y: 1000, size: 3000 });
  });
});

describe('Besetzung', () => {
  const demoPilot = { id: 'demo-pilot' };
  const demo = Array.from({ length: 10 }, (_, i) => ({ id: `demo-${i}` }));

  it('nutzt eigene Fotos nach Rolle', () => {
    const photos = [
      { id: 'kind', role: 'pilot' as const },
      { id: 'mama', role: 'passenger' as const },
      { id: 'papa', role: 'passenger' as const },
      { id: 'oma', role: 'passenger' as const },
      { id: 'zoo', role: 'reward' as const },
    ];
    const cast = buildCast(photos, 3, demoPilot, demo);
    expect(cast.pilot.id).toBe('kind');
    expect(cast.passengers.map((p) => p.id)).toEqual(['mama', 'papa', 'oma']);
    expect(cast.rewards.map((p) => p.id)).toEqual(['zoo']);
    expect(cast.placeholders).toBe(0);
  });

  it('füllt fehlende Passagiere mit Platzhaltern auf', () => {
    const cast = buildCast([{ id: 'mama', role: 'passenger' as const }], 5, demoPilot, demo);
    expect(cast.passengers).toHaveLength(5);
    expect(cast.placeholders).toBe(4);
  });

  it('ohne Pilot- und Belohnungsfoto: Platzhalter-Pilot, Belohnung ist der Pilot', () => {
    const cast = buildCast([], 3, demoPilot, demo);
    expect(cast.pilot).toBe(demoPilot);
    expect(cast.rewards).toEqual([demoPilot]);
  });
});
