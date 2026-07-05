import { round2 } from './money.js';

/**
 * HKS komisyoncu deduction engine.
 *
 * A komisyoncu sells the müstahsil's (producer's) goods and deducts, from the
 * gross sale amount, the commission (+ its VAT), hal rüsum, income-tax
 * withholding (gelir vergisi stopajı) and any additional tevkifat (e.g. SGK/
 * Bağ-Kur). The remainder (net) is paid to the müstahsil.
 *
 * All rates are fractions (0.08 = %8). Legal ceiling for komisyon is %8.
 */
export interface DeductionInput {
  brut: number;
  komisyonOrani: number; // <= 0.08 by law
  komisyonKdvOrani: number; // e.g. 0.20
  rusumOrani: number; // e.g. 0.02
  gelirVergisiOrani: number; // stopaj, e.g. 0.02
  tevkifatOrani?: number; // optional additional withholding
}

export interface DeductionResult {
  brut: number;
  komisyon: number;
  komisyonKdv: number;
  rusum: number;
  stopaj: number;
  tevkifat: number;
  toplamKesinti: number;
  net: number; // payable to müstahsil
}

export const KOMISYON_YASAL_TAVAN = 0.08;

export function computeDeductions(input: DeductionInput): DeductionResult {
  const { brut, komisyonOrani, komisyonKdvOrani, rusumOrani, gelirVergisiOrani } = input;
  if (brut < 0) throw new Error('Brüt tutar negatif olamaz');
  if (komisyonOrani < 0 || komisyonOrani > KOMISYON_YASAL_TAVAN) {
    throw new Error(`Komisyon oranı 0 ile %${KOMISYON_YASAL_TAVAN * 100} arasında olmalıdır`);
  }
  for (const [name, v] of Object.entries({ komisyonKdvOrani, rusumOrani, gelirVergisiOrani, tevkifatOrani: input.tevkifatOrani ?? 0 })) {
    if (v < 0 || v > 1) throw new Error(`${name} 0-1 aralığında olmalıdır`);
  }

  const komisyon = round2(brut * komisyonOrani);
  const komisyonKdv = round2(komisyon * komisyonKdvOrani);
  const rusum = round2(brut * rusumOrani);
  const stopaj = round2(brut * gelirVergisiOrani);
  const tevkifat = round2(brut * (input.tevkifatOrani ?? 0));

  const toplamKesinti = round2(komisyon + komisyonKdv + rusum + stopaj + tevkifat);
  const net = round2(brut - toplamKesinti);

  return { brut: round2(brut), komisyon, komisyonKdv, rusum, stopaj, tevkifat, toplamKesinti, net };
}
