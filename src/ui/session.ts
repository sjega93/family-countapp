import type { User } from 'firebase/auth';
import type { FamilyData } from '../services/data/family';

/** Zustand der Verbindung zu Firebase, wie App und Eltern-Bereich ihn sehen. */
export type Session =
  | { kind: 'demo' } // keine Firebase-Konfiguration: nur Platzhalter
  | { kind: 'signed-out' }
  | { kind: 'loading'; user: User }
  | { kind: 'ready'; user: User; family: FamilyData }
  | { kind: 'error'; user: User; message: string };
