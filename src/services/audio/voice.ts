/**
 * Sprachausgabe: zuerst die aufgenommene Stimme, sonst die Sprachausgabe des Geräts (Hochdeutsch).
 *
 * Aufnahmen kommen ab Etappe 3 aus der Cloud. Bis dahin liefert die Quelle nichts,
 * und alles läuft über die Ersatzstimme.
 */

import { audioContext } from './sounds';

export type VoiceLine =
  | 'greeting'
  | 'help'
  | 'allAboard'
  | 'bye'
  | 'goodnight'
  | 'passengers'
  | 'onePassenger';

/** Schlüssel einer einzelnen Aufnahme, z. B. „count-3“ oder „line-greeting“. */
export type ClipKey = `count-${number}` | `line-${VoiceLine}` | `name-${string}`;

export const NUMBER_WORDS = ['eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn'];

export const LINE_TEXT: Record<VoiceLine, string> = {
  greeting: 'Wer fliegt mit?',
  help: 'Wer will noch mitfliegen?',
  allAboard: 'Alle an Bord!',
  bye: 'Tschüss!',
  goodnight: 'Alle sind gelandet. Die Flugzeuge schlafen jetzt.',
  passengers: 'Passagiere!',
  onePassenger: 'Ein Passagier!',
};

/** Liefert eine aufgenommene Datei, falls vorhanden. */
export interface RecordingSource {
  get(key: ClipKey): AudioBuffer | undefined;
}

const noRecordings: RecordingSource = { get: () => undefined };
let recordings: RecordingSource = noRecordings;

export function setRecordingSource(source: RecordingSource): void {
  recordings = source;
}

let currentSource: AudioBufferSourceNode | null = null;
let germanVoice: SpeechSynthesisVoice | null | undefined;

function pickGermanVoice(): SpeechSynthesisVoice | null {
  if (germanVoice !== undefined) return germanVoice;
  if (typeof speechSynthesis === 'undefined') return (germanVoice = null);
  const voices = speechSynthesis.getVoices();
  if (voices.length === 0) return null; // noch nicht geladen; später erneut versuchen
  germanVoice =
    voices.find((v) => v.lang === 'de-DE' && v.localService) ??
    voices.find((v) => v.lang === 'de-DE') ??
    voices.find((v) => v.lang.startsWith('de')) ??
    null;
  return germanVoice;
}

/** Bricht laufende Ansagen ab, z. B. wenn schnell hintereinander getippt wird. */
export function stopSpeaking(): void {
  try {
    currentSource?.stop();
  } catch {
    /* bereits beendet */
  }
  currentSource = null;
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
}

function playBuffer(buffer: AudioBuffer): Promise<void> {
  const ctx = audioContext();
  return new Promise((resolve) => {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.onended = () => resolve();
    currentSource = src;
    src.start();
  });
}

function speakText(text: string, rate = 0.9): Promise<void> {
  if (typeof speechSynthesis === 'undefined') return wait(estimate(text));
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE';
    u.rate = rate;
    u.pitch = 1.1;
    const voice = pickGermanVoice();
    if (voice) u.voice = voice;
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    u.onend = finish;
    u.onerror = finish;
    // iOS meldet das Ende nicht immer zuverlässig: Sicherheitsnetz.
    setTimeout(finish, estimate(text) + 1500);
    speechSynthesis.speak(u);
  });
}

function estimate(text: string): number {
  return Math.max(700, text.length * 90);
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function playClip(key: ClipKey, fallbackText: string): Promise<void> {
  const buffer = recordings.get(key);
  if (buffer) return playBuffer(buffer);
  return speakText(fallbackText);
}

export function sayLine(line: VoiceLine): Promise<void> {
  return playClip(`line-${line}`, LINE_TEXT[line]);
}

export function sayNumber(n: number): Promise<void> {
  return playClip(`count-${n}`, capitalize(NUMBER_WORDS[n - 1] ?? String(n)));
}

/** „Eins, zwei, drei“ – einzeln, damit die Oberfläche jedes Fenster dazu aufleuchten lassen kann. */
export async function sayTotal(total: number): Promise<void> {
  if (total === 1) return sayLine('onePassenger');
  const recordedNumber = recordings.get(`count-${total}`);
  const recordedWord = recordings.get('line-passengers');
  if (recordedNumber && recordedWord) {
    await playBuffer(recordedNumber);
    await playBuffer(recordedWord);
    return;
  }
  return speakText(`${capitalize(NUMBER_WORDS[total - 1])} Passagiere!`);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Muss in einer Berührung aufgerufen werden: Safari gibt Ton und Sprachausgabe
 * erst nach einer Nutzeraktion frei.
 */
export function unlockSpeech(): void {
  if (typeof speechSynthesis === 'undefined') return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
  pickGermanVoice();
  speechSynthesis.addEventListener?.('voiceschanged', () => {
    germanVoice = undefined;
    pickGermanVoice();
  });
}
