/**
 * Maße und Fensterpositionen der Flugzeuge, getrennt von der Zeichnung, damit testbar.
 * Die Nase zeigt nach links, das Cockpit sitzt vorn, die Passagierfenster folgen nach rechts.
 */

import type { PlaneKind } from '../../logic/game';

export interface Point {
  x: number;
  y: number;
}

export interface PlaneGeometry {
  width: number;
  height: number;
  /** Rumpf: obere Kante und Höhe. */
  bodyTop: number;
  bodyHeight: number;
  /** x-Position, an der der Rumpf nach hinten zum Leitwerk übergeht. */
  bodyEnd: number;
  windowRadius: number;
  cockpit: Point;
  /** Ein Fenster pro Gast, in Einsteige-Reihenfolge. */
  windows: Point[];
}

const SPACING = 76;
const RADIUS = 28;
const NOSE = 210;
const TAIL = 170;

export function planeGeometry(kind: PlaneKind, seats: number): PlaneGeometry {
  if (kind === 'jumbo') {
    const cols = Math.ceil(seats / 2);
    const bodyTop = 70;
    const bodyHeight = 170;
    const rowA = bodyTop + 50;
    const rowB = bodyTop + 120;
    const bodyEnd = NOSE + cols * SPACING + 20;
    const windows: Point[] = [];
    for (let i = 0; i < seats; i++) {
      const upper = i < cols;
      const col = upper ? i : i - cols;
      windows.push({ x: NOSE + col * SPACING + RADIUS, y: upper ? rowA : rowB });
    }
    return {
      width: bodyEnd + TAIL,
      height: 330,
      bodyTop,
      bodyHeight,
      bodyEnd,
      windowRadius: RADIUS,
      cockpit: { x: 120, y: rowA - 4 },
      windows,
    };
  }

  const bodyTop = 90;
  const bodyHeight = 100;
  const y = bodyTop + bodyHeight / 2;
  const bodyEnd = NOSE + seats * SPACING + 10;
  return {
    width: bodyEnd + TAIL,
    height: kind === 'jet' ? 280 : 270,
    bodyTop,
    bodyHeight,
    bodyEnd,
    windowRadius: RADIUS,
    cockpit: { x: 118, y: y - 6 },
    windows: Array.from({ length: seats }, (_, i) => ({ x: NOSE + i * SPACING + RADIUS, y })),
  };
}
