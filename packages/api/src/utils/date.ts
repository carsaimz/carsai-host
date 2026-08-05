/**
 * CARSAI HOST — Date utilities
 */
export function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 3600_000);
}
export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}
export function isExpired(iso: string): boolean {
  return new Date(iso) < new Date();
}
export function toIso(d: Date = new Date()): string {
  return d.toISOString();
}
