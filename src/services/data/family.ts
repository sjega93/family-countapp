/**
 * Daten-Dienst: Anmeldung, Familie, Einstellungen und Fotos.
 * Alles wird aus Firestore in den Arbeitsspeicher geladen; Bilder werden zu Blob-URLs,
 * die beim Schließen der App mit verschwinden.
 *
 * Später kann hier eine Zwischenschicht für einen Offline-Modus ergänzt werden,
 * ohne Spiel oder Oberfläche zu ändern.
 */

import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  Bytes,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { firebase } from '../../firebase/app';
import type { PhotoRole } from '../../logic/cast';
import { DEFAULT_SETTINGS, isValidSettings, type GameSettings } from '../../logic/settings';

export interface FamilyPhoto {
  id: string;
  role: PhotoRole;
  name?: string;
  /** Blob-URL im Arbeitsspeicher. */
  url: string;
}

export interface FamilyData {
  familyId: string;
  settings: GameSettings;
  photos: FamilyPhoto[];
}

export class NotInFamilyError extends Error {
  constructor() {
    super('Dieses Konto ist noch keiner Familie zugeordnet.');
  }
}

function services() {
  const s = firebase();
  if (!s) throw new Error('Firebase ist nicht konfiguriert.');
  return s;
}

export function isConfigured(): boolean {
  return firebase() !== null;
}

/** Meldet Änderungen der Anmeldung; liefert sofort den aktuellen Stand. */
export function watchUser(cb: (user: User | null) => void): () => void {
  const s = firebase();
  if (!s) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(s.auth, cb);
}

export async function login(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(services().auth, email.trim(), password);
}

export async function logout(): Promise<void> {
  await signOut(services().auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(services().auth, email.trim());
}

/** Übersetzt Firebase-Fehler in verständliche Sätze für den Eltern-Bereich. */
export function errorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (e instanceof NotInFamilyError) return e.message;
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'E-Mail oder Passwort stimmt nicht.';
  if (code.includes('invalid-email')) return 'Die E-Mail-Adresse ist ungültig.';
  if (code.includes('too-many-requests')) return 'Zu viele Versuche. Bitte kurz warten.';
  if (code.includes('network') || code.includes('unavailable')) return 'Keine Verbindung zum Internet.';
  if (code.includes('permission-denied')) return 'Keine Berechtigung. Ist das Konto der Familie zugeordnet?';
  return e instanceof Error ? e.message : 'Unbekannter Fehler.';
}

export async function familyIdOf(uid: string): Promise<string> {
  const snap = await getDoc(doc(services().db, 'users', uid));
  const familyId = snap.exists() ? (snap.data().familyId as unknown) : undefined;
  if (typeof familyId !== 'string' || !familyId) throw new NotInFamilyError();
  return familyId;
}

function bytesToUrl(data: Bytes, mime: string): string {
  return URL.createObjectURL(new Blob([data.toUint8Array() as BlobPart], { type: mime }));
}

function toPhoto(d: QueryDocumentSnapshot<DocumentData>): FamilyPhoto | null {
  const v = d.data();
  if (!(v.data instanceof Bytes) || typeof v.mime !== 'string') return null;
  return { id: d.id, role: v.role as PhotoRole, name: typeof v.name === 'string' ? v.name : undefined, url: bytesToUrl(v.data, v.mime) };
}

/** Gibt die Blob-URLs frei, wenn die Fotos nicht mehr gebraucht werden. */
export function releasePhotos(photos: FamilyPhoto[]): void {
  for (const p of photos) URL.revokeObjectURL(p.url);
}

export async function loadSettings(familyId: string): Promise<GameSettings> {
  const snap = await getDoc(doc(services().db, 'families', familyId, 'settings', 'game'));
  if (!snap.exists()) return DEFAULT_SETTINGS;
  const v = snap.data();
  const s: GameSettings = { flights: v.flights, timeLimitMinutes: v.timeLimitMinutes ?? null };
  return isValidSettings(s) ? s : DEFAULT_SETTINGS;
}

/** Lädt beim Spielstart alles Nötige in den Arbeitsspeicher. */
export async function loadFamily(uid: string): Promise<FamilyData> {
  const familyId = await familyIdOf(uid);
  const [settings, photoSnap] = await Promise.all([
    loadSettings(familyId),
    getDocs(collection(services().db, 'families', familyId, 'photos')),
  ]);
  const photos = photoSnap.docs.map(toPhoto).filter((p): p is FamilyPhoto => p !== null);
  return { familyId, settings, photos };
}

export async function saveSettings(familyId: string, settings: GameSettings): Promise<void> {
  await setDoc(doc(services().db, 'families', familyId, 'settings', 'game'), {
    flights: settings.flights,
    timeLimitMinutes: settings.timeLimitMinutes,
    updatedAt: serverTimestamp(),
  });
}

/** Live-Liste der Fotos für den Eltern-Bereich. Ändert jemand auf einem anderen Gerät etwas, erscheint es sofort. */
export function watchPhotos(familyId: string, cb: (photos: FamilyPhoto[]) => void, onError: (e: unknown) => void): () => void {
  let current: FamilyPhoto[] = [];
  return onSnapshot(
    collection(services().db, 'families', familyId, 'photos'),
    (snap) => {
      const next = snap.docs.map(toPhoto).filter((p): p is FamilyPhoto => p !== null);
      releasePhotos(current);
      current = next;
      cb(next);
    },
    onError,
  );
}

function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function addPhoto(familyId: string, blob: Blob, role: PhotoRole, name?: string): Promise<void> {
  const data = Bytes.fromUint8Array(new Uint8Array(await blob.arrayBuffer()));
  await setDoc(doc(services().db, 'families', familyId, 'photos', newId()), {
    role,
    ...(name ? { name: name.slice(0, 30) } : {}),
    mime: blob.type,
    data,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePhoto(familyId: string, id: string, role: PhotoRole, name?: string): Promise<void> {
  const ref = doc(services().db, 'families', familyId, 'photos', id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const v = snap.data();
  // Ganzes Dokument neu schreiben, damit ein entfernter Name auch wirklich verschwindet.
  await setDoc(ref, {
    role,
    ...(name ? { name: name.slice(0, 30) } : {}),
    mime: v.mime,
    data: v.data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePhoto(familyId: string, id: string): Promise<void> {
  await deleteDoc(doc(services().db, 'families', familyId, 'photos', id));
}
