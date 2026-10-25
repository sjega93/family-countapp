/**
 * Firebase-Dienste, einmalig initialisiert. Firestore läuft bewusst nur mit Arbeitsspeicher-Cache:
 * Fotos und Aufnahmen werden nie dauerhaft auf dem Gerät abgelegt.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: FirebaseServices | null | undefined;

/** Liefert die Dienste oder null im Demo-Modus (keine Konfiguration). */
export function firebase(): FirebaseServices | null {
  if (services !== undefined) return services;
  const cfg = firebaseConfig();
  if (!cfg) return (services = null);
  const app = initializeApp({
    apiKey: cfg.apiKey,
    authDomain: cfg.authDomain,
    projectId: cfg.projectId,
    appId: cfg.appId,
  });
  if (cfg.appCheckSiteKey) {
    initializeAppCheck(app, { provider: new ReCaptchaV3Provider(cfg.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  }
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  services = { app, auth: getAuth(app), db };
  return services;
}
