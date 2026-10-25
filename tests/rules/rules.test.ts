/**
 * Prüft die Sicherheitsregeln gegen den lokalen Firebase-Emulator, nie gegen echte Daten.
 * Aufruf: cd tests/rules && npm test
 */

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { Bytes, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

const FAMILY = 'fam1';
const PARENT = 'mama';
const STRANGER = 'fremd';

const bytes = (n: number) => Bytes.fromUint8Array(new Uint8Array(n));

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-countapp',
    firestore: { rules: readFileSync('../../firebase/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'families', FAMILY), { members: [PARENT] });
    await setDoc(doc(db, 'users', PARENT), { familyId: FAMILY });
    await setDoc(doc(db, `families/${FAMILY}/settings/game`), { flights: [3, 4, 5], timeLimitMinutes: null });
    await setDoc(doc(db, `families/${FAMILY}/photos/vorhanden`), { role: 'pilot', mime: 'image/webp', data: bytes(10) });
  });
});

const parent = () => env.authenticatedContext(PARENT);
const stranger = () => env.authenticatedContext(STRANGER);
const anonymous = () => env.unauthenticatedContext();

describe('Familie und Einstellungen', () => {
  it('Familienmitglied liest Einstellungen', async () => {
    await assertSucceeds(getDoc(doc(parent().firestore(), `families/${FAMILY}/settings/game`)));
  });

  it('Fremde und nicht Angemeldete lesen nichts', async () => {
    await assertFails(getDoc(doc(stranger().firestore(), `families/${FAMILY}/settings/game`)));
    await assertFails(getDoc(doc(anonymous().firestore(), `families/${FAMILY}/settings/game`)));
    await assertFails(getDoc(doc(stranger().firestore(), `users/${PARENT}`)));
    await assertFails(getDoc(doc(stranger().firestore(), `families/${FAMILY}/photos/vorhanden`)));
  });

  it('niemand kann sich selbst zur Familie hinzufügen', async () => {
    await assertFails(setDoc(doc(stranger().firestore(), 'families', FAMILY), { members: [PARENT, STRANGER] }));
    await assertFails(setDoc(doc(parent().firestore(), 'families', FAMILY), { members: [PARENT, STRANGER] }));
    await assertFails(setDoc(doc(stranger().firestore(), 'users', STRANGER), { familyId: FAMILY }));
  });

  it('gültige Einstellungen werden gespeichert, ungültige abgelehnt', async () => {
    const db = parent().firestore();
    const path = `families/${FAMILY}/settings/game`;
    await assertSucceeds(setDoc(doc(db, path), { flights: [1, 10, 2, 3, 4], timeLimitMinutes: 10 }));
    await assertFails(setDoc(doc(db, path), { flights: [3, 11], timeLimitMinutes: null }));
    await assertFails(setDoc(doc(db, path), { flights: [], timeLimitMinutes: null }));
    await assertFails(setDoc(doc(db, path), { flights: [1, 2, 3, 4, 5, 6], timeLimitMinutes: null }));
    await assertFails(setDoc(doc(db, path), { flights: [3], timeLimitMinutes: null, extra: true }));
  });
});

describe('Fotos', () => {
  const photo = (extra: Record<string, unknown> = {}) => ({
    role: 'passenger',
    name: 'Mama',
    mime: 'image/webp',
    data: bytes(40 * 1024),
    ...extra,
  });

  it('Familienmitglied speichert und löscht ein Foto', async () => {
    const db = parent().firestore();
    await assertSucceeds(setDoc(doc(db, `families/${FAMILY}/photos/abc`), photo()));
    await assertSucceeds(getDoc(doc(db, `families/${FAMILY}/photos/abc`)));
    await assertSucceeds(deleteDoc(doc(db, `families/${FAMILY}/photos/abc`)));
  });

  it('lehnt falsches Format, falsche Rolle, zu große und leere Dateien ab', async () => {
    const db = parent().firestore();
    const ref = doc(db, `families/${FAMILY}/photos/abc`);
    await assertFails(setDoc(ref, photo({ mime: 'image/jpeg' })));
    await assertFails(setDoc(ref, photo({ role: 'chef' })));
    await assertFails(setDoc(ref, photo({ data: bytes(400 * 1024) })));
    await assertFails(setDoc(ref, photo({ data: bytes(0) })));
    await assertFails(setDoc(ref, photo({ data: 'kein-bytes-feld' })));
    await assertFails(setDoc(ref, photo({ gps: '47.3,8.5' })));
  });

  it('Fremde speichern keine Fotos', async () => {
    await assertFails(setDoc(doc(stranger().firestore(), `families/${FAMILY}/photos/abc`), photo()));
  });
});

describe('Sprachaufnahmen', () => {
  it('nur AAC und nur bekannte Schlüssel', async () => {
    const db = parent().firestore();
    const rec = { mime: 'audio/mp4', data: bytes(15 * 1024) };
    await assertSucceeds(setDoc(doc(db, `families/${FAMILY}/recordings/count-3`), rec));
    await assertSucceeds(setDoc(doc(db, `families/${FAMILY}/recordings/line-greeting`), rec));
    await assertFails(setDoc(doc(db, `families/${FAMILY}/recordings/count-11`), rec));
    await assertFails(setDoc(doc(db, `families/${FAMILY}/recordings/count-3`), { ...rec, mime: 'audio/wav' }));
  });
});
