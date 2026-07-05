import { nanoid } from 'nanoid';

/**
 * Payment gateway abstraction. Phase 1 ships a deterministic MOCK gateway using
 * mock credentials; Phase 2 (EPIC-11 / "Real payment gateway") implements this
 * same interface against a real provider (3DS, settlement, refunds).
 */
export interface PaymentInit {
  amount: number;
  cardNumber?: string; // mock: last digit drives success/fail
}

export interface PaymentInitResult {
  token: string;
  durum: 'BASLATILDI';
}

export interface PaymentConfirmResult {
  success: boolean;
  durum: 'BASARILI' | 'BASARISIZ';
  message: string;
}

export interface PaymentProvider {
  readonly name: string;
  initialize(p: PaymentInit): Promise<PaymentInitResult>;
  confirm(token: string, opts?: { force?: 'success' | 'fail' }): Promise<PaymentConfirmResult>;
  refund(token: string): Promise<{ success: boolean; durum: 'IADE' }>;
}

export class MockPaymentGateway implements PaymentProvider {
  readonly name = 'MOCK_GATEWAY';
  private amounts = new Map<string, number>();

  async initialize(p: PaymentInit): Promise<PaymentInitResult> {
    if (p.amount <= 0) throw new Error('Tutar 0 dan büyük olmalı');
    const token = `tok_${nanoid(16)}`;
    this.amounts.set(token, p.amount);
    return { token, durum: 'BASLATILDI' };
  }

  async confirm(token: string, opts?: { force?: 'success' | 'fail' }): Promise<PaymentConfirmResult> {
    if (!this.amounts.has(token)) throw new Error('Geçersiz veya süresi dolmuş ödeme token');
    // Deterministic: default success; caller can force failure to test the path.
    const success = opts?.force === 'fail' ? false : true;
    return success
      ? { success: true, durum: 'BASARILI', message: 'Ödeme onaylandı (mock 3DS)' }
      : { success: false, durum: 'BASARISIZ', message: 'Ödeme reddedildi (mock)' };
  }

  async refund(token: string): Promise<{ success: boolean; durum: 'IADE' }> {
    this.amounts.delete(token);
    return { success: true, durum: 'IADE' };
  }
}

let _provider: PaymentProvider = new MockPaymentGateway();
export function getPaymentProvider(): PaymentProvider {
  return _provider;
}
export function setPaymentProvider(p: PaymentProvider) {
  _provider = p;
}
