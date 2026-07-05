/** Parse & bound pagination params from a query object. */
export function pageParams(q: any, defaultLimit = 200, maxLimit = 1000): { limit: number; offset: number } {
  const rawLimit = Number(q?.limit);
  const rawOffset = Number(q?.offset);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, maxLimit) : defaultLimit;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  return { limit, offset };
}
