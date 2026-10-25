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
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { getBytes, ref, uploadBytes } from 'firebase/storage';

let env: RulesTestEnvironment;

const FAMILY = 'fam1';
const PARENT = 'mama';
const STRANGER = 'fremd';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-countapp',
    firestore: { rules: readFileSync('../../firebase/firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
    storage: { rules: readFileSync('../../firebase/storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'families', FAMILY), { members: [PARENT] });
    await setDoc(doc(db, 'users', PARENT), { familyId: FAMILY });
    await setDoc(doc(db, `families/${FAMILY}/settings/game`), { flights: [3, 4, 5], timeLimitMinutes: null });
    await uploadBytes(ref(ctx.storage(), `families/${FAMILY}/eingang/original.jpg`), new Uint8Array([1, 2, 3]), {
      contentType: 'image/jpeg',
    });
  });
});

const parent = () => env.authenticatedContext(PARENT);
const stranger = () => env.authenticatedContext(STRANGER);
const anonymous = () => env.unauthenticatedContext();

describe('Firestore', () => {
  it('Familienmitglied liest Einstellungen', async () => {
    await assertSucceeds(getDoc(doc(parent().firestore(), `families/${FAMILY}/settings/game`)));
  });

  it('Fremde und nicht Angemeldete lesen nichts', async () => {
    await assertFails(getDoc(doc(stranger().firestore(), `families/${FAMILY}/settings/game`)));
    await assertFails(getDoc(doc(anonymous().firestore(), `families/${FAMILY}/settings/game`)));
    await assertFails(getDoc(doc(stranger().firestore(), `users/${PARENT}`)));
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

  it('Foto-Einträge müssen auf den passenden Speicherort zeigen', async () => {
    const db = parent().firestore();
    await assertSucceeds(
      setDoc(doc(db, `families/${FAMILY}/photos/abc`), {
        role: 'passenger',
        name: 'Mama',
        path: `families/${FAMILY}/photos/abc.webp`,
      }),
    );
    await assertFails(
      setDoc(doc(db, `families/${FAMILY}/photos/abc`), { role: 'passenger', path: 'woanders/abc.webp' }),
    );
    await assertFails(
      setDoc(doc(db, `families/${FAMILY}/photos/abc`), { role: 'chef', path: `families/${FAMILY}/photos/abc.webp` }),
    );
    await assertSucceeds(deleteDoc(doc(db, `families/${FAMILY}/photos/abc`)));
  });
});

describe('Storage', () => {
  const webp = new Uint8Array(1000);
  const meta = { contentType: 'image/webp', cacheControl: 'no-store' };

  it('Familienmitglied lädt ein fertiges Foto hoch', async () => {
    await assertSucceeds(uploadBytes(ref(parent().storage(), `families/${FAMILY}/photos/abc.webp`), webp, meta));
  });

  it('lehnt falsches Format, fehlendes Cache-Verbot und zu große Dateien ab', async () => {
    const s = parent().storage();
    await assertFails(
      uploadBytes(ref(s, `families/${FAMILY}/photos/abc.webp`), webp, { contentType: 'image/jpeg', cacheControl: 'no-store' }),
    );
    await assertFails(uploadBytes(ref(s, `families/${FAMILY}/photos/abc.webp`), webp, { contentType: 'image/webp' }));
    await assertFails(uploadBytes(ref(s, `families/${FAMILY}/photos/abc.webp`), new Uint8Array(400 * 1024), meta));
  });

  it('Fremde laden nichts hoch und lesen nichts', async () => {
    await assertFails(uploadBytes(ref(stranger().storage(), `families/${FAMILY}/photos/abc.webp`), webp, meta));
    await assertFails(getBytes(ref(stranger().storage(), `families/${FAMILY}/eingang/original.jpg`)));
  });

  it('die App liest den Eingang, schreibt aber nicht hinein', async () => {
    await assertSucceeds(getBytes(ref(parent().storage(), `families/${FAMILY}/eingang/original.jpg`)));
    await assertFails(
      uploadBytes(ref(parent().storage(), `families/${FAMILY}/eingang/neu.jpg`), webp, { contentType: 'image/jpeg' }),
    );
  });

  it('Sprachaufnahmen nur als AAC', async () => {
    const s = parent().storage();
    const audio = new Uint8Array(2000);
    await assertSucceeds(
      uploadBytes(ref(s, `families/${FAMILY}/voice/count-3.m4a`), audio, { contentType: 'audio/mp4', cacheControl: 'no-store' }),
    );
    await assertFails(
      uploadBytes(ref(s, `families/${FAMILY}/voice/count-3.m4a`), audio, { contentType: 'audio/wav', cacheControl: 'no-store' }),
    );
  });
});
