import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  isValidSettings,
  requiredPassengerPhotos,
  withFlightCount,
  withGuests,
} from '../../src/logic/settings';

describe('Einstellungen', () => {
  it('Standard ist 3 Flüge mit 3, 4 und 5 Gästen, ohne Zeitlimit', () => {
    expect(DEFAULT_SETTINGS).toEqual({ flights: [3, 4, 5], timeLimitMinutes: null });
    expect(isValidSettings(DEFAULT_SETTINGS)).toBe(true);
  });

  it('erlaubt 1 bis 5 Flüge mit je 1 bis 10 Gästen', () => {
    expect(isValidSettings({ flights: [1], timeLimitMinutes: null })).toBe(true);
    expect(isValidSettings({ flights: [10, 10, 10, 10, 10], timeLimitMinutes: null })).toBe(true);
    expect(isValidSettings({ flights: [], timeLimitMinutes: null })).toBe(false);
    expect(isValidSettings({ flights: [1, 2, 3, 4, 5, 6], timeLimitMinutes: null })).toBe(false);
    expect(isValidSettings({ flights: [0], timeLimitMinutes: null })).toBe(false);
    expect(isValidSettings({ flights: [11], timeLimitMinutes: null })).toBe(false);
    expect(isValidSettings({ flights: [2.5], timeLimitMinutes: null })).toBe(false);
  });

  it('prüft das Zeitlimit', () => {
    expect(isValidSettings({ flights: [3], timeLimitMinutes: 10 })).toBe(true);
    expect(isValidSettings({ flights: [3], timeLimitMinutes: 0 })).toBe(false);
  });

  it('braucht so viele Passagierfotos wie der größte Flug', () => {
    expect(requiredPassengerPhotos({ flights: [2, 7, 4], timeLimitMinutes: null })).toBe(7);
  });

  it('übernimmt beim Hinzufügen von Flügen die letzte Gästezahl', () => {
    expect(withFlightCount(DEFAULT_SETTINGS, 5).flights).toEqual([3, 4, 5, 5, 5]);
    expect(withFlightCount(DEFAULT_SETTINGS, 2).flights).toEqual([3, 4]);
    expect(withFlightCount(DEFAULT_SETTINGS, 9).flights).toHaveLength(5);
    expect(withFlightCount(DEFAULT_SETTINGS, 0).flights).toHaveLength(1);
  });

  it('begrenzt die Gästezahl auf 1 bis 10', () => {
    expect(withGuests(DEFAULT_SETTINGS, 0, 12).flights[0]).toBe(10);
    expect(withGuests(DEFAULT_SETTINGS, 0, 0).flights[0]).toBe(1);
  });
});
