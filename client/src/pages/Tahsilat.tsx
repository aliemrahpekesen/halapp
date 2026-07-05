import { useEffect, useState } from 'react';
import { Card, Form, Select, InputNumber, DatePicker, Button, Segmented, message, Typography, Table } from 'antd';
import dayjs from 'dayjs';
import { api, apiError } from '../api';

export default function Tahsilat() {
  const [form] = Form.useForm();
  const [tur, setTur] = useState<'tahsil' | 'tediye'>('tahsil');
  const [cariler, setCariler] = useState<any[]>([]);
  const [kasalar, setKasalar] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/params/cari-hesaplar').then((r) => setCariler(r.data));
    api.get('/params/kasalar').then((r) => setKasalar(r.data));
  }, []);

  const submit = async (v: any) => {
    setLoading(true);
    try {
      await api.post(`/finans/${tur}`, { tarih: dayjs(v.tarih).format('YYYY-MM-DD'), cariId: v.cariId, kasaId: v.kasaId, tutar: Number(v.tutar), aciklama: v.aciklama });
      message.success(tur === 'tahsil' ? 'Tahsilat kaydedildi' : 'Tediye kaydedildi');
      form.resetFields(['tutar', 'aciklama']);
      api.get('/params/kasalar').then((r) => setKasalar(r.data));
    } catch (e) { message.error(apiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <Typography.Title level={4}>Tahsilat / Tediye</Typography.Title>
      <Card style={{ maxWidth: 520 }}>
        <Segmented options={[{ value: 'tahsil', label: 'Tahsilat (Gelen)' }, { value: 'tediye', label: 'Tediye (Giden)' }]} value={tur} onChange={(v) => setTur(v as any)} style={{ marginBottom: 16 }} />
        <Form form={form} layout="vertical" onFinish={submit} initialValues={{ tarih: dayjs() }}>
          <Form.Item name="cariId" label="Cari Hesap" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={cariler.map((c) => ({ value: c.id, label: `${c.unvan} (${c.tip})` }))} /></Form.Item>
          <Form.Item name="kasaId" label="Kasa" rules={[{ required: true }]}><Select options={kasalar.map((k) => ({ value: k.id, label: k.ad }))} /></Form.Item>
          <Form.Item name="tarih" label="Tarih" rules={[{ required: true }]}><DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="tutar" label="Tutar" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: '100%' }} addonAfter="₺" /></Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>Kaydet</Button>
        </Form>
      </Card>
      <Typography.Title level={5} style={{ marginTop: 24 }}>Kasa Durumları</Typography.Title>
      <Table rowKey="id" size="small" dataSource={kasalar} columns={[{ title: 'Kasa', dataIndex: 'ad' }, { title: 'Bakiye', dataIndex: 'bakiye', render: (v) => `${v?.toFixed(2)} ₺` }]} pagination={false} />
    </div>
  );
}
