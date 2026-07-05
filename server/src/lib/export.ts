/** Minimal CSV serializer (Excel-openable). Handles quoting/escaping. */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return (columns ?? []).join(',');
  const cols = columns ?? Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const str = v === null || v === undefined ? '' : String(v);
    return /[",\n;]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const header = cols.join(',');
  const body = rows.map((r) => cols.map((c) => esc(r[c])).join(',')).join('\n');
  return `${header}\n${body}`;
}
