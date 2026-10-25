/**
 * Rechenaufgabe als Sperre für den Eltern-Bereich.
 * Zwei Zahlen von 6 bis 9 ergeben eine zweistellige Summe: für Kleinkinder unlösbar,
 * für Erwachsene in Sekunden.
 */

import type { Rng } from './game';

export interface GateTask {
  a: number;
  b: number;
  answer: number;
}

export function newGateTask(rng: Rng = Math.random): GateTask {
  const a = 6 + Math.floor(rng() * 4);
  const b = 6 + Math.floor(rng() * 4);
  return { a, b, answer: a + b };
}

export function checkGate(task: GateTask, input: string): boolean {
  return input.trim() !== '' && Number(input) === task.answer;
}
