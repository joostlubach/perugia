import { customAlphabet } from 'nanoid';

// No 0/O/1/I to avoid ambiguity when players type the code on a phone.
const generateCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 5);
const generateToken = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 24);

export function newRoomCode(): string {
  return generateCode();
}

export function newToken(): string {
  return generateToken();
}

export function scoreForAnswer(points: number, timeLimitSec: number, elapsedMs: number): number {
  const timeLimitMs = timeLimitSec * 1000;
  const ratio = Math.max(0, Math.min(1, elapsedMs / timeLimitMs));
  // Full points for an instant answer, decaying to half points at the wire.
  return Math.round(points * (1 - ratio * 0.5));
}
