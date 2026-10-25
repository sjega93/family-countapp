/**
 * Spiel-Logik als Zustandsmaschine.
 *
 * Ein Flug: arriving → boarding → recounting → departing.
 * Eine Runde: mehrere Flüge, danach reward, dann startet automatisch die nächste Runde.
 * Mit Zeitlimit: Ist die Zeit abgelaufen, wird der laufende Flug fertig gespielt,
 * danach folgt goodnight (Ende).
 *
 * Die Logik kennt weder Bildschirm noch Ton noch Speicher. Sie bekommt Ereignisse
 * und liefert den neuen Zustand plus eine Liste von Effekten (z. B. „sag Zwei“),
 * die die Oberfläche ausführt. Dadurch ist sie vollständig testbar.
 */

import type { GameSettings } from './settings';

export type Phase = 'arriving' | 'boarding' | 'recounting' | 'departing' | 'reward' | 'goodnight';

export type PlaneKind = 'prop' | 'jet' | 'jumbo';
export type Scenery = 'day' | 'sunset' | 'night';
export const SCENERIES: readonly Scenery[] = ['day', 'sunset', 'night'];

/** Wie viele wartende Gäste vorne in der Schlange groß und antippbar sind. */
export const VISIBLE_QUEUE = 3;

export interface Person {
  id: string;
  /** Optionaler Name, z. B. „Mama“; wird nach dem Zahlwort angesagt, falls aufgenommen. */
  name?: string;
}

export interface GameState {
  settings: GameSettings;
  round: number;
  flightIndex: number;
  phase: Phase;
  plane: PlaneKind;
  scenery: Scenery;
  waiting: Person[];
  boarded: Person[];
  timeUp: boolean;
}

export type GameEvent =
  | { type: 'ARRIVED' }
  | { type: 'TAP_PASSENGER'; id: string }
  | { type: 'RECOUNT_DONE' }
  | { type: 'DEPARTED' }
  | { type: 'REWARD_DONE' }
  | { type: 'TIME_UP' };

export type Effect =
  | { type: 'say'; line: 'greeting' | 'allAboard' | 'bye' | 'goodnight' }
  | { type: 'count'; n: number; person: Person }
  | { type: 'recount'; total: number }
  | { type: 'boarded'; person: Person; seat: number };

export interface Step {
  state: GameState;
  effects: Effect[];
}

/** Zufallsquelle 0 ≤ x < 1; in Tests deterministisch ersetzbar. */
export type Rng = () => number;

export interface GameContext {
  /** Alle verfügbaren Passagiere (ohne Pilot). */
  pool: Person[];
  rng: Rng;
}

export function planeFor(guests: number): PlaneKind {
  if (guests <= 3) return 'prop';
  if (guests <= 6) return 'jet';
  return 'jumbo';
}

/** Wählt n verschiedene Personen zufällig aus dem Pool. */
export function pickPassengers(pool: Person[], n: number, rng: Rng): Person[] {
  if (pool.length < n) {
    throw new Error(`Zu wenige Passagierfotos: ${pool.length} vorhanden, ${n} benötigt`);
  }
  const copy = pool.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function pickScenery(rng: Rng): Scenery {
  return SCENERIES.at(Math.floor(rng() * SCENERIES.length)) ?? 'day';
}

function startFlight(state: Omit<GameState, 'plane' | 'waiting' | 'boarded' | 'phase'>, ctx: GameContext): GameState {
  const guests = state.settings.flights[state.flightIndex];
  return {
    ...state,
    phase: 'arriving',
    plane: planeFor(guests),
    waiting: pickPassengers(ctx.pool, guests, ctx.rng),
    boarded: [],
  };
}

export function createGame(settings: GameSettings, ctx: GameContext): GameState {
  return startFlight(
    { settings, round: 1, flightIndex: 0, scenery: pickScenery(ctx.rng), timeUp: false },
    ctx,
  );
}

/** Die vorne in der Schlange stehenden, antippbaren Gäste. */
export function visibleQueue(state: GameState): Person[] {
  return state.waiting.slice(0, VISIBLE_QUEUE);
}

export function guestsThisFlight(state: GameState): number {
  return state.settings.flights[state.flightIndex];
}

export function step(state: GameState, event: GameEvent, ctx: GameContext): Step {
  // Zeitlimit kann jederzeit eintreffen; es beendet nichts sofort.
  if (event.type === 'TIME_UP') {
    if (state.phase === 'goodnight') return { state, effects: [] };
    return { state: { ...state, timeUp: true }, effects: [] };
  }

  switch (state.phase) {
    case 'arriving':
      if (event.type === 'ARRIVED') {
        return { state: { ...state, phase: 'boarding' }, effects: [{ type: 'say', line: 'greeting' }] };
      }
      break;

    case 'boarding':
      if (event.type === 'TAP_PASSENGER') {
        const front = visibleQueue(state);
        const person = front.find((p) => p.id === event.id);
        if (!person) break; // Tipp auf einen Gast hinten in der Schlange: ignorieren
        const boarded = [...state.boarded, person];
        const waiting = state.waiting.filter((p) => p.id !== person.id);
        const effects: Effect[] = [
          { type: 'boarded', person, seat: boarded.length - 1 },
          { type: 'count', n: boarded.length, person },
        ];
        if (waiting.length === 0) {
          effects.push({ type: 'recount', total: boarded.length });
          return { state: { ...state, boarded, waiting, phase: 'recounting' }, effects };
        }
        return { state: { ...state, boarded, waiting }, effects };
      }
      break;

    case 'recounting':
      if (event.type === 'RECOUNT_DONE') {
        return {
          state: { ...state, phase: 'departing' },
          effects: [
            { type: 'say', line: 'allAboard' },
            { type: 'say', line: 'bye' },
          ],
        };
      }
      break;

    case 'departing':
      if (event.type === 'DEPARTED') {
        const isLastFlight = state.flightIndex >= state.settings.flights.length - 1;
        if (state.timeUp) {
          return { state: { ...state, phase: 'goodnight' }, effects: [{ type: 'say', line: 'goodnight' }] };
        }
        if (isLastFlight) {
          return { state: { ...state, phase: 'reward' }, effects: [] };
        }
        return { state: startFlight({ ...state, flightIndex: state.flightIndex + 1 }, ctx), effects: [] };
      }
      break;

    case 'reward':
      if (event.type === 'REWARD_DONE') {
        if (state.timeUp) {
          return { state: { ...state, phase: 'goodnight' }, effects: [{ type: 'say', line: 'goodnight' }] };
        }
        return {
          state: startFlight(
            { ...state, round: state.round + 1, flightIndex: 0, scenery: pickScenery(ctx.rng) },
            ctx,
          ),
          effects: [],
        };
      }
      break;

    case 'goodnight':
      break;
  }
  return { state, effects: [] };
}
