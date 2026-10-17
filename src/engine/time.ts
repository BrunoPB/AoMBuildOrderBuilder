const CLOCK = /^(\d{1,3}):([0-5]\d)$/;

export function isClock(value: string): boolean {
  return CLOCK.test(value);
}

export function parseClock(value: string): number {
  const match = CLOCK.exec(value.trim());
  if (!match) throw new Error(`invalid time "${value}"`);
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
