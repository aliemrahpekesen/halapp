import type { CrudConfig } from '../components/CrudPage';

export const paramConfigs: CrudConfig[] = [
  {
    path: 'cari-hesaplar', title: 'Cari Hesaplar', endpoint: '/params/cari-hesaplar',
    columns: [{ key: 'kod', title: 'Kod' }, { key: 'unvan', title: 'Ünvan' }, { key: 'tip', title: 'Tip' }, { key: 'bakiye', title: 'Bakiye' }],
    fields: [
      { name: 'kod', label: 'Kod', required: true },
      { name: 'unvan', label: 'Ünvan', required: true },
      { name: 'tip', label: 'Tip', type: 'select', required: true, options: ['MUSTAHSIL', 'ALICI', 'TEDARIKCI', 'PERSONEL', 'TAHSILATCI'].map((v) => ({ value: v, label: v })) },
      { name: 'vknTckn', label: 'VKN/TCKN' },
      { name: 'telefon', label: 'Telefon' },
      { name: 'riskLimiti', label: 'Risk Limiti', type: 'number' },
    ],
  },
  {
    path: 'balik-gruplari', title: 'Balık Grupları', endpoint: '/params/balik-gruplari',
    columns: [{ key: 'kod', title: 'Kod' }, { key: 'ad', title: 'Ad' }],
    fields: [{ name: 'kod', label: 'Kod', required: true }, { name: 'ad', label: 'Ad', required: true }],
  },
  {
    path: 'balik-cinsleri', title: 'Balık Cinsleri', endpoint: '/params/balik-cinsleri',
    columns: [{ key: 'kod', title: 'Kod' }, { key: 'ad', title: 'Ad' }, { key: 'rusumOrani', title: 'Rüsum Oranı' }, { key: 'birim', title: 'Birim' }],
    fields: [
      { name: 'kod', label: 'Kod', required: true },
      { name: 'ad', label: 'Ad', required: true },
      { name: 'grupId', label: 'Grup', type: 'select', optionsFrom: '/params/balik-gruplari', optionLabel: 'ad' },
      { name: 'rusumOrani', label: 'Rüsum Oranı (0-1)', type: 'number', step: 0.01 },
      { name: 'birim', label: 'Birim' },
    ],
  },
  {
    path: 'kasalar', title: 'Kasalar', endpoint: '/params/kasalar',
    columns: [{ key: 'kod', title: 'Kod' }, { key: 'ad', title: 'Ad' }, { key: 'paraBirimi', title: 'Para Birimi' }, { key: 'bakiye', title: 'Bakiye' }],
    fields: [{ name: 'kod', label: 'Kod', required: true }, { name: 'ad', label: 'Ad', required: true }, { name: 'paraBirimi', label: 'Para Birimi' }],
  },
  {
    path: 'depolar', title: 'Depolar', endpoint: '/params/depolar',
    columns: [{ key: 'kod', title: 'Kod' }, { key: 'ad', title: 'Ad' }],
    fields: [{ name: 'kod', label: 'Kod', required: true }, { name: 'ad', label: 'Ad', required: true }],
  },
  {
    path: 'bankalar', title: 'Bankalar', endpoint: '/params/bankalar',
    columns: [{ key: 'kod', title: 'Kod' }, { key: 'ad', title: 'Ad' }],
    fields: [{ name: 'kod', label: 'Kod', required: true }, { name: 'ad', label: 'Ad', required: true }],
  },
  {
    path: 'kdv-kodlari', title: 'KDV Kodları', endpoint: '/params/kdv-kodlari',
    columns: [{ key: 'kod', title: 'Kod' }, { key: 'ad', title: 'Ad' }, { key: 'oran', title: 'Oran' }],
    fields: [{ name: 'kod', label: 'Kod', required: true }, { name: 'ad', label: 'Ad', required: true }, { name: 'oran', label: 'Oran (0-1)', type: 'number', step: 0.01, required: true }],
  },
  {
    path: 'isyeri', title: 'İşyeri / HKS Ayarları', endpoint: '/params/isyeri',
    columns: [{ key: 'kod', title: 'Kod' }, { key: 'unvan', title: 'Ünvan' }, { key: 'hksKomisyonOrani', title: 'Komisyon' }],
    fields: [
      { name: 'kod', label: 'Kod', required: true },
      { name: 'unvan', label: 'Ünvan', required: true },
      { name: 'vkn', label: 'VKN' },
      { name: 'hksKomisyonOrani', label: 'HKS Komisyon Oranı (≤0.08)', type: 'number', step: 0.01 },
      { name: 'hksKomisyonKdvOrani', label: 'Komisyon KDV Oranı', type: 'number', step: 0.01 },
      { name: 'hksGelirVergisiOrani', label: 'Gelir Vergisi Stopaj Oranı', type: 'number', step: 0.01 },
    ],
  },
];
