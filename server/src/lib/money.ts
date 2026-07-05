/** Round to 2 decimals using half-up, avoiding binary float drift. */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function sum(nums: number[]): number {
  return round2(nums.reduce((a, b) => a + b, 0));
}
