/**
 * Wer spielt mit: Pilot, Passagiere und Belohnungsfotos aus den Familienfotos.
 * Fehlen Fotos, wird mit gezeichneten Platzhaltern aufgefüllt, damit das Spiel nie hängen bleibt.
 */

export type PhotoRole = 'pilot' | 'passenger' | 'reward';

export interface CastMember {
  id: string;
  role?: PhotoRole;
}

export interface Cast<T extends CastMember> {
  pilot: T;
  passengers: T[];
  rewards: T[];
  /** Wie viele Platzhalter mitspielen, weil Passagierfotos fehlen. */
  placeholders: number;
}

export function buildCast<T extends CastMember>(
  photos: T[],
  neededPassengers: number,
  demoPilot: T,
  demoPassengers: T[],
): Cast<T> {
  const pilot = photos.find((p) => p.role === 'pilot') ?? demoPilot;
  const own = photos.filter((p) => p.role === 'passenger');
  const missing = Math.max(0, neededPassengers - own.length);
  const passengers = [...own, ...demoPassengers.slice(0, missing)];
  const rewards = photos.filter((p) => p.role === 'reward');
  return {
    pilot,
    passengers,
    rewards: rewards.length ? rewards : [pilot],
    placeholders: missing,
  };
}
