import { describe, it, expect } from 'vitest';
import { computeDeductions, KOMISYON_YASAL_TAVAN } from '../src/lib/deductions.js';

describe('HKS deduction engine', () => {
  it('computes a typical müstahsil settlement', () => {
    const r = computeDeductions({
      brut: 10000,
      komisyonOrani: 0.08,
      komisyonKdvOrani: 0.2,
      rusumOrani: 0.02,
      gelirVergisiOrani: 0.02,
    });
    expect(r.komisyon).toBe(800);
    expect(r.komisyonKdv).toBe(160);
    expect(r.rusum).toBe(200);
    expect(r.stopaj).toBe(200);
    expect(r.tevkifat).toBe(0);
    expect(r.toplamKesinti).toBe(1360);
    expect(r.net).toBe(8640);
  });

  it('includes additional tevkifat when provided', () => {
    const r = computeDeductions({
      brut: 5000, komisyonOrani: 0.05, komisyonKdvOrani: 0.2, rusumOrani: 0.01, gelirVergisiOrani: 0.02, tevkifatOrani: 0.01,
    });
    expect(r.komisyon).toBe(250);
    expect(r.komisyonKdv).toBe(50);
    expect(r.rusum).toBe(50);
    expect(r.stopaj).toBe(100);
    expect(r.tevkifat).toBe(50);
    expect(r.net).toBe(5000 - 500);
  });

  it('net + toplamKesinti always equals brut', () => {
    for (const brut of [0, 1, 33.33, 999.99, 123456.78]) {
      const r = computeDeductions({ brut, komisyonOrani: 0.08, komisyonKdvOrani: 0.2, rusumOrani: 0.02, gelirVergisiOrani: 0.02 });
      expect(r.net + r.toplamKesinti).toBeCloseTo(r.brut, 2);
    }
  });

  it('rejects komisyon above the legal ceiling', () => {
    expect(() => computeDeductions({ brut: 100, komisyonOrani: KOMISYON_YASAL_TAVAN + 0.01, komisyonKdvOrani: 0.2, rusumOrani: 0, gelirVergisiOrani: 0 })).toThrow();
  });

  it('rejects negative gross', () => {
    expect(() => computeDeductions({ brut: -1, komisyonOrani: 0.08, komisyonKdvOrani: 0.2, rusumOrani: 0.02, gelirVergisiOrani: 0.02 })).toThrow();
  });

  it('handles rounding at the kuruş boundary', () => {
    const r = computeDeductions({ brut: 33.33, komisyonOrani: 0.08, komisyonKdvOrani: 0.2, rusumOrani: 0.02, gelirVergisiOrani: 0.02 });
    // 33.33 * 0.08 = 2.6664 -> 2.67
    expect(r.komisyon).toBe(2.67);
    expect(r.komisyonKdv).toBe(0.53); // 2.67 * 0.2 = 0.534 -> 0.53
  });
});
