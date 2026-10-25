/**
 * Öffentliche Web-Konfiguration des Firebase-Projekts (nicht geheim).
 * Wird ab Etappe 3 über Umgebungsvariablen gesetzt (siehe .env.example).
 * Fehlt sie, läuft die App im Demo-Modus mit Platzhalter-Gesichtern.
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
  appCheckSiteKey: string;
}

export function firebaseConfig(): FirebaseWebConfig | null {
  const env = import.meta.env;
  const cfg = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    appId: env.VITE_FIREBASE_APP_ID,
    appCheckSiteKey: env.VITE_APPCHECK_SITE_KEY,
  };
  return Object.values(cfg).every(Boolean) ? (cfg as FirebaseWebConfig) : null;
}
