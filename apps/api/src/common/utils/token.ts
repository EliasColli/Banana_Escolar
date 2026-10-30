import { createHash, randomUUID } from 'node:crypto';

export const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const newJti = (): string => randomUUID();

/** Convierte "15m", "7d", "3600" a segundos. */
export function parseDurationToSeconds(value: string, fallbackSeconds: number): number {
  const match = /^(\d+)\s*([smhd])?$/i.exec(value.trim());
  if (!match) return fallbackSeconds;
  const amount = Number(match[1]);
  const unit = (match[2] ?? 's').toLowerCase();
  const factors: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86_400 };
  return amount * (factors[unit] ?? 1);
}
