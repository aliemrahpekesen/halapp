import { useEffect, useState } from 'react';
import { Card, Form, Select, DatePicker, Button, Table, InputNumber, Space, Typography, message, Tag, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, apiError } from '../api';

export default function SatisFisi() {
  const [form] = Form.useForm();
  const [depolar, setDepolar] = useState<any[]>([]);
  const [kasalar, setKasalar] = useState<any[]>([]);
  const [cinsler, setCinsler] = useState<any[]>([]);
  const [cariler, setCariler] = useState<any[]>([]);
  const [satirlar, setSatirlar] = useState<any[]>([{ balikCinsId: undefined, miktar: undefined, birimFiyat: undefined, kapAdet: undefined }]);
  const [fisler, setFisler] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRefs = () => {
    api.get('/params/depolar').then((r) => setDepolar(r.data));
    api.get('/params/kasalar').then((r) => setKasalar(r.data));
    api.get('/params/balik-cinsleri').then((r) => setCinsler(r.data));
    api.get('/params/cari-hesaplar').then((r) => setCariler(r.data));
    api.get('/satis/fisler').then((r) => setFisler(r.data));
  };
  useEffect(loadRefs, []);

  const brut = satirlar.reduce((a, s) => a + (Number(s.miktar) || 0) * (Number(s.birimFiyat) || 0), 0);

  const submit = async (v: any) => {
    const validSatirlar = satirlar.filter((s) => s.balikCinsId && s.miktar && s.birimFiyat);
    if (!validSatirlar.length) return message.error('En az bir geçerli satır girin');
    setLoading(true);
    try {
      await api.post('/satis/fisler', {
        tip: v.tip, tarih: dayjs(v.tarih).format('YYYY-MM-DD'),
        aliciCariId: v.aliciCariId, mustahsilCariId: v.mustahsilCariId,
        depoId: v.depoId, kasaId: v.kasaId, odemeTipi: v.odemeTipi, kunyeNo: v.kunyeNo,
        satirlar: validSatirlar.map((s) => ({ balikCinsId: s.balikCinsId, miktar: Number(s.miktar), birimFiyat: Number(s.birimFiyat), kapAdet: Number(s.kapAdet) || 0 })),
      });
      message.success('Satış fişi işlendi');
      setSatirlar([{ balikCinsId: undefined, miktar: undefined, birimFiyat: undefined, kapAdet: undefined }]);
      form.resetFields(['aliciCariId', 'mustahsilCariId', 'kunyeNo']);
      loadRefs();
    } catch (e) { message.error(apiError(e)); }
    finally { setLoading(false); }
  };

  const cinsOpt = cinsler.map((c) => ({ value: c.id, label: `${c.ad} (${c.kod})` }));

  return (
    <div>
      <Typography.Title level={4}>Satış Fişi</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={submit} initialValues={{ tip: 'SATIS', odemeTipi: 'VERESIYE', tarih: dayjs() }}>
          <Space wrap size="middle">
            <Form.Item name="tip" label="Tip"><Select style={{ width: 140 }} options={[{ value: 'SATIS', label: 'Komisyon Satış' }, { value: 'ALIS_SATIS', label: 'Alış-Satış' }]} /></Form.Item>
            <Form.Item name="tarih" label="Tarih" rules={[{ required: true }]}><DatePicker format="DD.MM.YYYY" /></Form.Item>
            <Form.Item name="aliciCariId" label="Alıcı" rules={[{ required: true }]}><Select style={{ width: 200 }} showSearch optionFilterProp="label" options={cariler.filter((c) => c.tip === 'ALICI').map((c) => ({ value: c.id, label: c.unvan }))} data-testid="alici" /></Form.Item>
            <Form.Item name="mustahsilCariId" label="Müstahsil"><Select style={{ width: 200 }} showSearch optionFilterProp="label" allowClear options={cariler.filter((c) => c.tip === 'MUSTAHSIL').map((c) => ({ value: c.id, label: c.unvan }))} /></Form.Item>
            <Form.Item name="depoId" label="Depo" rules={[{ required: true }]}><Select style={{ width: 160 }} options={depolar.map((d) => ({ value: d.id, label: d.ad }))} /></Form.Item>
            <Form.Item name="odemeTipi" label="Ödeme"><Select style={{ width: 140 }} options={[{ value: 'VERESIYE', label: 'Veresiye' }, { value: 'PESIN', label: 'Peşin' }]} /></Form.Item>
            <Form.Item name="kasaId" label="Kasa"><Select style={{ width: 160 }} allowClear options={kasalar.map((k) => ({ value: k.id, label: k.ad }))} /></Form.Item>
            <Form.Item name="kunyeNo" label="Künye No"><input className="ant-input" style={{ width: 160, height: 32, padding: '4px 11px', border: '1px solid #d9d9d9', borderRadius: 6 }} /></Form.Item>
          </Space>

          <Divider>Satırlar</Divider>
          <Table
            rowKey={(_, i) => String(i)} pagination={false} size="small"
            dataSource={satirlar}
            columns={[
              { title: 'Balık', render: (_, __, i) => <Select style={{ width: 180 }} options={cinsOpt} showSearch optionFilterProp="label" value={satirlar[i].balikCinsId} onChange={(v) => setSatirlar((s) => s.map((x, j) => j === i ? { ...x, balikCinsId: v } : x))} /> },
              { title: 'Kap', render: (_, __, i) => <InputNumber min={0} value={satirlar[i].kapAdet} onChange={(v) => setSatirlar((s) => s.map((x, j) => j === i ? { ...x, kapAdet: v } : x))} /> },
              { title: 'Miktar (kg)', render: (_, __, i) => <InputNumber min={0} value={satirlar[i].miktar} onChange={(v) => setSatirlar((s) => s.map((x, j) => j === i ? { ...x, miktar: v } : x))} data-testid={`miktar-${i}`} /> },
              { title: 'Birim Fiyat', render: (_, __, i) => <InputNumber min={0} value={satirlar[i].birimFiyat} onChange={(v) => setSatirlar((s) => s.map((x, j) => j === i ? { ...x, birimFiyat: v } : x))} data-testid={`fiyat-${i}`} /> },
              { title: 'Tutar', render: (_, __, i) => ((Number(satirlar[i].miktar) || 0) * (Number(satirlar[i].birimFiyat) || 0)).toFixed(2) },
              { title: '', render: (_, __, i) => <Button danger size="small" icon={<DeleteOutlined />} onClick={() => setSatirlar((s) => s.filter((_, j) => j !== i))} /> },
            ]}
          />
          <Button type="dashed" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => setSatirlar((s) => [...s, { balikCinsId: undefined, miktar: undefined, birimFiyat: undefined, kapAdet: undefined }])}>Satır Ekle</Button>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography.Title level={5} style={{ margin: 0 }}>Brüt Toplam: {brut.toFixed(2)} ₺</Typography.Title>
            <Button type="primary" htmlType="submit" loading={loading} data-testid="satis-kaydet">Fişi İşle</Button>
          </div>
        </Form>
      </Card>

      <Typography.Title level={5} style={{ marginTop: 24 }}>Son Satış Fişleri</Typography.Title>
      <Table rowKey="id" size="small" dataSource={fisler} data-testid="fis-listesi"
        columns={[
          { title: 'No', dataIndex: 'no' },
          { title: 'Tarih', dataIndex: 'tarih' },
          { title: 'Tip', dataIndex: 'tip' },
          { title: 'Brüt', dataIndex: 'brutTutar', render: (v) => v?.toFixed(2) },
          { title: 'Net', dataIndex: 'netTutar', render: (v) => v?.toFixed(2) },
          { title: 'Durum', dataIndex: 'durum', render: (d) => <Tag color={d === 'ISLENDI' ? 'green' : d === 'IPTAL' ? 'red' : 'default'}>{d}</Tag> },
        ]}
      />
    </div>
  );
}
