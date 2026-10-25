/**
 * Geräusche, im Code erzeugt mit Web Audio. Keine Dateien, keine Lizenzen.
 */

let ctx: AudioContext | null = null;

export function audioContext(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();
  }
  return ctx;
}

/** In einer Berührung aufrufen, damit Safari den Ton freigibt. */
export function unlockSounds(): void {
  const c = audioContext();
  if (c.state === 'suspended') void c.resume();
  // Ein stiller Ton weckt die Ausgabe auf älteren iPhones.
  const buf = c.createBuffer(1, 1, 22050);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start();
}

function envelope(gain: GainNode, t: number, attack: number, peak: number, release: number) {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(peak, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
}

function tone(freq: number, type: OscillatorType, start: number, dur: number, peak = 0.2, glideTo?: number) {
  const c = audioContext();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, start + dur);
  envelope(g, start, 0.01, peak, dur);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.05);
}

function noise(start: number, dur: number, peak: number, filterFreq: number, filterTo?: number) {
  const c = audioContext();
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, start);
  if (filterTo) filter.frequency.exponentialRampToValueAtTime(filterTo, start + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(start);
}

function now(): number {
  return audioContext().currentTime;
}

/** Kurzes „Plopp“, wenn ein Gast einsteigt. */
export function pop(): void {
  const t = now();
  tone(420, 'sine', t, 0.18, 0.3, 900);
}

/** Heller Glockenton beim Nachzählen; steigt mit jedem Fenster. */
export function chime(index: number): void {
  const t = now();
  const base = 523.25 * Math.pow(2, (index % 8) / 12);
  tone(base, 'sine', t, 0.5, 0.18);
  tone(base * 2, 'sine', t, 0.3, 0.05);
}

/** Motorbrummen beim Heranrollen. */
export function engineRoll(seconds: number): void {
  const t = now();
  const c = audioContext();
  const osc = c.createOscillator();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(70, t);
  osc.frequency.linearRampToValueAtTime(55, t + seconds);
  filter.type = 'lowpass';
  filter.frequency.value = 400;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.08, t + 0.4);
  g.gain.setValueAtTime(0.08, t + seconds - 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(filter).connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + seconds + 0.1);
}

/** Aufheulender Motor und Rauschen beim Abheben. */
export function takeoff(seconds: number): void {
  const t = now();
  const c = audioContext();
  const osc = c.createOscillator();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(70, t);
  osc.frequency.exponentialRampToValueAtTime(220, t + seconds * 0.7);
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, t);
  filter.frequency.exponentialRampToValueAtTime(1600, t + seconds * 0.7);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  osc.connect(filter).connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + seconds + 0.1);
  noise(t + 0.3, seconds - 0.3, 0.12, 600, 3000);
}

/** Hupe, wenn das Flugzeug angetippt wird. */
export function honk(): void {
  const t = now();
  tone(330, 'square', t, 0.12, 0.08);
  tone(392, 'square', t + 0.15, 0.16, 0.08);
}

/** Weiches Pusten, wenn in den Himmel getippt wird. */
export function puff(): void {
  noise(now(), 0.35, 0.06, 900, 300);
}

/** Funkeln bei der Belohnung. */
export function sparkle(): void {
  const t = now();
  [659.25, 783.99, 987.77, 1318.5].forEach((f, i) => tone(f, 'triangle', t + i * 0.12, 0.4, 0.12));
}
