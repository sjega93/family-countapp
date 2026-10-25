import { describe, expect, it } from 'vitest';
import { planeGeometry } from '../../src/ui/art/planeGeometry';

function overlaps(a: { x: number; y: number }, b: { x: number; y: number }, r: number) {
  return Math.hypot(a.x - b.x, a.y - b.y) < 2 * r;
}

describe('Flugzeug-Geometrie', () => {
  for (const [kind, seats] of [
    ['prop', 1],
    ['prop', 3],
    ['jet', 6],
    ['jumbo', 7],
    ['jumbo', 10],
  ] as const) {
    it(`${kind} mit ${seats} Gästen: ein Fenster pro Gast, keine Überlappung, alles im Bild`, () => {
      const g = planeGeometry(kind, seats);
      expect(g.windows).toHaveLength(seats);
      const all = [g.cockpit, ...g.windows];
      for (let i = 0; i < all.length; i++) {
        expect(all[i].x - g.windowRadius).toBeGreaterThanOrEqual(0);
        expect(all[i].x + g.windowRadius).toBeLessThanOrEqual(g.width);
        expect(all[i].y - g.windowRadius).toBeGreaterThanOrEqual(0);
        expect(all[i].y + g.windowRadius).toBeLessThanOrEqual(g.height);
        for (let j = i + 1; j < all.length; j++) {
          expect(overlaps(all[i], all[j], g.windowRadius)).toBe(false);
        }
      }
    });
  }

  it('Jumbo hat zwei Fensterreihen, oben zuerst', () => {
    const g = planeGeometry('jumbo', 9);
    const ys = new Set(g.windows.map((w) => w.y));
    expect(ys.size).toBe(2);
    expect(g.windows[0].y).toBeLessThan(g.windows[8].y);
  });
});
