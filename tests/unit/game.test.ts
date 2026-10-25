import { describe, expect, it } from 'vitest';
import {
  createGame,
  pickPassengers,
  planeFor,
  step,
  visibleQueue,
  type GameContext,
  type GameEvent,
  type GameState,
  type Person,
} from '../../src/logic/game';
import { DEFAULT_SETTINGS, type GameSettings } from '../../src/logic/settings';

/** Deterministische Zufallsquelle für reproduzierbare Tests. */
function seeded(seed = 42) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const pool: Person[] = Array.from({ length: 10 }, (_, i) => ({ id: `p${i + 1}` }));
const ctx = (): GameContext => ({ pool, rng: seeded() });

function run(state: GameState, events: GameEvent[], c: GameContext) {
  let s = state;
  const effects = [];
  for (const e of events) {
    const r = step(s, e, c);
    s = r.state;
    effects.push(...r.effects);
  }
  return { state: s, effects };
}

/** Lässt alle wartenden Gäste von vorn einsteigen. */
function boardAll(state: GameState, c: GameContext) {
  let s = state;
  const effects = [];
  while (s.phase === 'boarding') {
    const r = step(s, { type: 'TAP_PASSENGER', id: visibleQueue(s)[0].id }, c);
    s = r.state;
    effects.push(...r.effects);
  }
  return { state: s, effects };
}

function playFlight(state: GameState, c: GameContext) {
  let r = run(state, [{ type: 'ARRIVED' }], c);
  r = boardAll(r.state, c);
  return run(r.state, [{ type: 'RECOUNT_DONE' }, { type: 'DEPARTED' }], c);
}

describe('Flugzeuggröße', () => {
  it('wächst mit der Gästezahl', () => {
    expect(planeFor(1)).toBe('prop');
    expect(planeFor(3)).toBe('prop');
    expect(planeFor(4)).toBe('jet');
    expect(planeFor(6)).toBe('jet');
    expect(planeFor(7)).toBe('jumbo');
    expect(planeFor(10)).toBe('jumbo');
  });
});

describe('Passagiere auswählen', () => {
  it('wählt verschiedene Personen ohne Doppelte', () => {
    const picked = pickPassengers(pool, 10, seeded());
    expect(new Set(picked.map((p) => p.id)).size).toBe(10);
  });

  it('meldet zu wenige Fotos', () => {
    expect(() => pickPassengers(pool.slice(0, 2), 3, seeded())).toThrow(/Zu wenige/);
  });
});

describe('Ein Flug', () => {
  it('beginnt mit Ankunft und so vielen Wartenden wie Gästen', () => {
    const s = createGame(DEFAULT_SETTINGS, ctx());
    expect(s.phase).toBe('arriving');
    expect(s.waiting).toHaveLength(3);
    expect(s.boarded).toHaveLength(0);
  });

  it('begrüßt nach der Ankunft', () => {
    const c = ctx();
    const r = step(createGame(DEFAULT_SETTINGS, c), { type: 'ARRIVED' }, c);
    expect(r.state.phase).toBe('boarding');
    expect(r.effects).toEqual([{ type: 'say', line: 'greeting' }]);
  });

  it('zählt jeden eingestiegenen Gast mit dem nächsten Zahlwort', () => {
    const c = ctx();
    const s = run(createGame(DEFAULT_SETTINGS, c), [{ type: 'ARRIVED' }], c).state;
    const { effects } = boardAll(s, c);
    const counts = effects.filter((e) => e.type === 'count').map((e) => (e.type === 'count' ? e.n : 0));
    expect(counts).toEqual([1, 2, 3]);
  });

  it('zählt nach dem letzten Gast alle nach', () => {
    const c = ctx();
    const s = run(createGame(DEFAULT_SETTINGS, c), [{ type: 'ARRIVED' }], c).state;
    const r = boardAll(s, c);
    expect(r.state.phase).toBe('recounting');
    expect(r.effects.at(-1)).toEqual({ type: 'recount', total: 3 });
  });

  it('startet nach dem Nachzählen automatisch', () => {
    const c = ctx();
    let s = run(createGame(DEFAULT_SETTINGS, c), [{ type: 'ARRIVED' }], c).state;
    s = boardAll(s, c).state;
    const r = step(s, { type: 'RECOUNT_DONE' }, c);
    expect(r.state.phase).toBe('departing');
    expect(r.effects).toContainEqual({ type: 'say', line: 'allAboard' });
  });

  it('ignoriert Tipps auf Gäste hinten in der Schlange', () => {
    const c = ctx();
    const settings: GameSettings = { flights: [6], timeLimitMinutes: null };
    const s = run(createGame(settings, c), [{ type: 'ARRIVED' }], c).state;
    const hidden = s.waiting[4];
    const r = step(s, { type: 'TAP_PASSENGER', id: hidden.id }, c);
    expect(r.state).toBe(s);
    expect(r.effects).toEqual([]);
  });

  it('lässt jeden der vorderen drei Gäste einsteigen, nicht nur den ersten', () => {
    const c = ctx();
    const s = run(createGame(DEFAULT_SETTINGS, c), [{ type: 'ARRIVED' }], c).state;
    const third = s.waiting[2];
    const r = step(s, { type: 'TAP_PASSENGER', id: third.id }, c);
    expect(r.state.boarded).toEqual([third]);
  });

  it('ignoriert Tipps vor der Ankunft', () => {
    const c = ctx();
    const s = createGame(DEFAULT_SETTINGS, c);
    const r = step(s, { type: 'TAP_PASSENGER', id: s.waiting[0].id }, c);
    expect(r.state).toBe(s);
  });
});

describe('Runde', () => {
  it('spielt die Flüge mit steigender Gästezahl und zeigt dann die Belohnung', () => {
    const c = ctx();
    let s = createGame(DEFAULT_SETTINGS, c);
    const sizes: number[] = [];
    for (let i = 0; i < 3; i++) {
      sizes.push(s.waiting.length);
      s = playFlight(s, c).state;
    }
    expect(sizes).toEqual([3, 4, 5]);
    expect(s.phase).toBe('reward');
  });

  it('startet nach der Belohnung automatisch eine neue Runde', () => {
    const c = ctx();
    let s = createGame(DEFAULT_SETTINGS, c);
    for (let i = 0; i < 3; i++) s = playFlight(s, c).state;
    s = step(s, { type: 'REWARD_DONE' }, c).state;
    expect(s.round).toBe(2);
    expect(s.flightIndex).toBe(0);
    expect(s.phase).toBe('arriving');
  });

  it('funktioniert mit 1 Flug und 10 Gästen', () => {
    const c = ctx();
    const s = playFlight(createGame({ flights: [10], timeLimitMinutes: null }, c), c).state;
    expect(s.phase).toBe('reward');
  });
});

describe('Zeitlimit', () => {
  it('spielt den laufenden Flug fertig und endet dann', () => {
    const c = ctx();
    let s = run(createGame(DEFAULT_SETTINGS, c), [{ type: 'ARRIVED' }], c).state;
    s = step(s, { type: 'TIME_UP' }, c).state;
    expect(s.phase).toBe('boarding');
    s = boardAll(s, c).state;
    const r = run(s, [{ type: 'RECOUNT_DONE' }, { type: 'DEPARTED' }], c);
    expect(r.state.phase).toBe('goodnight');
    expect(r.effects).toContainEqual({ type: 'say', line: 'goodnight' });
  });

  it('endet nach der Belohnung, wenn die Zeit währenddessen abläuft', () => {
    const c = ctx();
    let s = createGame({ flights: [1], timeLimitMinutes: 5 }, c);
    s = playFlight(s, c).state;
    expect(s.phase).toBe('reward');
    s = step(s, { type: 'TIME_UP' }, c).state;
    s = step(s, { type: 'REWARD_DONE' }, c).state;
    expect(s.phase).toBe('goodnight');
  });
});
