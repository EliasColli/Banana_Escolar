/** Generador congruencial determinista (mulberry32). Misma semilla → mismos datos. */
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.floor(rng() * values.length)];
}

export function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pickWeighted<T>(rng: () => number, values: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let threshold = rng() * total;
  for (let index = 0; index < values.length; index += 1) {
    threshold -= weights[index];
    if (threshold <= 0) return values[index];
  }
  return values[values.length - 1];
}

export function shuffle<T>(rng: () => number, values: T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 86_400_000);

export const addHours = (date: Date, hours: number): Date =>
  new Date(date.getTime() + hours * 3_600_000);

export function formatMysqlDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}
