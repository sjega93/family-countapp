/**
 * Spiel-Einstellungen, die im Eltern-Bereich festgelegt werden.
 * Reine Daten und Prüfregeln, ohne Oberfläche oder Speicher.
 */

export const MIN_FLIGHTS = 1;
export const MAX_FLIGHTS = 5;
export const MIN_GUESTS = 1;
export const MAX_GUESTS = 10;

export interface GameSettings {
  /** Anzahl Gäste je Flug; die Länge der Liste ist die Anzahl Flüge pro Runde. */
  flights: number[];
  /** Zeitlimit in Minuten oder null für kein Limit. */
  timeLimitMinutes: number | null;
}

export const DEFAULT_SETTINGS: GameSettings = {
  flights: [3, 4, 5],
  timeLimitMinutes: null,
};

export function isValidSettings(s: GameSettings): boolean {
  if (s.flights.length < MIN_FLIGHTS || s.flights.length > MAX_FLIGHTS) return false;
  if (!s.flights.every((n) => Number.isInteger(n) && n >= MIN_GUESTS && n <= MAX_GUESTS)) return false;
  if (s.timeLimitMinutes !== null && !(Number.isInteger(s.timeLimitMinutes) && s.timeLimitMinutes > 0)) return false;
  return true;
}

/** Höchste Gästezahl über alle Flüge: so viele verschiedene Passagierfotos braucht es mindestens. */
export function requiredPassengerPhotos(s: GameSettings): number {
  return Math.max(...s.flights);
}

/**
 * Ändert die Anzahl Flüge. Neue Flüge übernehmen die Gästezahl des bisher letzten Flugs,
 * damit die Steigerung erhalten bleibt.
 */
export function withFlightCount(s: GameSettings, count: number): GameSettings {
  const n = clamp(count, MIN_FLIGHTS, MAX_FLIGHTS);
  const flights = s.flights.slice(0, n);
  while (flights.length < n) flights.push(flights.at(-1) ?? DEFAULT_SETTINGS.flights[0]);
  return { ...s, flights };
}

export function withGuests(s: GameSettings, flightIndex: number, guests: number): GameSettings {
  const flights = s.flights.slice();
  flights[flightIndex] = clamp(guests, MIN_GUESTS, MAX_GUESTS);
  return { ...s, flights };
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.round(n)));
}
