import { nanoid } from 'nanoid';

/**
 * e-Belge provider abstraction. Phase 1 ships a deterministic MOCK using mock
 * credentials; Phase 2 (EPIC-11 / issue "Real Uyumsoft") implements this same
 * interface against the real Uyumsoft API with zero changes to callers.
 */
export interface EbelgeDoc {
  tur: 'EFATURA' | 'EMUSTAHSIL' | 'EIRSALIYE';
  no?: string;
  tutar: number;
  aliciUnvan?: string;
  kalemler?: { ad: string; miktar: number; birimFiyat: number; tutar: number }[];
}

export interface EbelgeSendResult {
  uuid: string;
  no: string;
  durum: 'GONDERILDI';
  html: string;
}

export interface EbelgeProvider {
  readonly name: string;
  send(doc: EbelgeDoc): Promise<EbelgeSendResult>;
  getStatus(uuid: string): Promise<'GONDERILDI' | 'KABUL' | 'RED'>;
}

function guid(): string {
  const h = () => nanoid(4).replace(/[^a-z0-9]/gi, '0');
  return `${h()}${h()}-${h()}-${h()}-${h()}-${h()}${h()}${h()}`.toLowerCase();
}

function renderHtml(doc: EbelgeDoc, no: string, uuid: string): string {
  const rows = (doc.kalemler ?? []).map((k) => `<tr><td>${k.ad}</td><td>${k.miktar}</td><td>${k.birimFiyat}</td><td>${k.tutar}</td></tr>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${doc.tur} ${no}</title></head>
<body style="font-family:sans-serif">
<h2>${doc.tur} — ${no}</h2>
<p>UUID: ${uuid}</p>
<p>Alıcı: ${doc.aliciUnvan ?? '-'}</p>
<table border="1" cellspacing="0" cellpadding="4"><tr><th>Kalem</th><th>Miktar</th><th>Birim Fiyat</th><th>Tutar</th></tr>${rows}</table>
<h3>Genel Toplam: ${doc.tutar.toFixed(2)} TL</h3>
<p style="color:#888">MOCK belge — Uyumsoft test ortamı (Faz 2'de gerçek entegrasyon)</p>
</body></html>`;
}

/** Deterministic mock: send → GONDERILDI, then getStatus → KABUL. */
export class MockUyumsoftProvider implements EbelgeProvider {
  readonly name = 'UYUMSOFT_MOCK';
  async send(doc: EbelgeDoc): Promise<EbelgeSendResult> {
    const uuid = guid();
    const no = doc.no || `${doc.tur.slice(0, 3)}${new Date().getFullYear()}${nanoid(6).toUpperCase()}`;
    return { uuid, no, durum: 'GONDERILDI', html: renderHtml(doc, no, uuid) };
  }
  async getStatus(): Promise<'KABUL'> {
    // Mock GİB always accepts in the test environment.
    return 'KABUL';
  }
}

let _provider: EbelgeProvider = new MockUyumsoftProvider();
export function getEbelgeProvider(): EbelgeProvider {
  return _provider;
}
export function setEbelgeProvider(p: EbelgeProvider) {
  _provider = p;
}
