import type { DateTimeBounds } from '../domain/types.js';

export function asNumber(value: unknown): number {
  return Number(value ?? 0);
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return '';
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((header) => {
      const raw = row[header];
      const text = raw === null || raw === undefined ? '' : String(raw);
      return `"${text.replaceAll('"', '""')}"`;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

export function dateBounds(from: string, to: string): DateTimeBounds {
  const start = `${from}T00:00:00.000Z`;
  const endDate = new Date(`${to}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const endExclusive = endDate.toISOString();
  return { start, endExclusive };
}
