/**
 * Öffentliche Web-Konfiguration des Firebase-Projekts (nicht geheim).
 * Wird beim Bauen aus Umgebungsvariablen gesetzt (siehe .env.example, in CI aus den GitHub-Variablen).
 * Fehlt sie, läuft die App im Demo-Modus mit Platzhalter-Gesichtern.
 */

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  /** Optional: reCAPTCHA-Schlüssel für App Check. */
  appCheckSiteKey?: string;
}

export function firebaseConfig(): FirebaseWebConfig | null {
  const env = import.meta.env;
  const required = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
  };
  if (!Object.values(required).every(Boolean)) return null;
  return { ...(required as Omit<FirebaseWebConfig, 'appCheckSiteKey'>), appCheckSiteKey: env.VITE_APPCHECK_SITE_KEY || undefined };
}
