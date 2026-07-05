import { useEffect, useState } from 'react';
import { Card, Form, Select, InputNumber, Button, Typography, message, Steps, Tag, Table, Space } from 'antd';
import { api, apiError } from '../api';

export default function Odeme() {
  const [form] = Form.useForm();
  const [cariler, setCariler] = useState<any[]>([]);
  const [kasalar, setKasalar] = useState<any[]>([]);
  const [odemeId, setOdemeId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [rows, setRows] = useState<any[]>([]);

  const load = () => api.get('/odeme').then((r) => setRows(r.data));
  useEffect(() => {
    api.get('/params/cari-hesaplar').then((r) => setCariler(r.data));
    api.get('/params/kasalar').then((r) => setKasalar(r.data));
    load();
  }, []);

  const baslat = async (v: any) => {
    try {
      const { data } = await api.post('/odeme/baslat', { cariId: v.cariId, tutar: Number(v.tutar) });
      setOdemeId(data.id); setStep(1); message.success('Ödeme başlatıldı (mock 3DS)');
    } catch (e) { message.error(apiError(e)); }
  };
  const onayla = async (force?: 'fail') => {
    const kasaId = form.getFieldValue('kasaId');
    if (!kasaId) return message.error('Kasa seçin');
    try {
      const { data } = await api.post('/odeme/onayla', { odemeId, kasaId, force });
      if (data.durum === 'BASARILI') { message.success('Ödeme başarılı'); setStep(2); }
      else { message.warning('Ödeme başarısız'); setStep(0); }
      setOdemeId(null); load();
    } catch (e) { message.error(apiError(e)); }
  };

  return (
    <div>
      <Typography.Title level={4}>Kart ile Tahsilat <Tag color="orange">Mock Gateway</Tag></Typography.Title>
      <Card style={{ maxWidth: 560 }}>
        <Steps current={step} size="small" items={[{ title: 'Başlat' }, { title: '3DS Onay' }, { title: 'Tamam' }]} style={{ marginBottom: 16 }} />
        <Form form={form} layout="vertical" onFinish={baslat}>
          <Form.Item name="cariId" label="Cari" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={cariler.map((c) => ({ value: c.id, label: c.unvan }))} /></Form.Item>
          <Form.Item name="kasaId" label="POS/Kasa Hesabı" rules={[{ required: true }]}><Select options={kasalar.map((k) => ({ value: k.id, label: k.ad }))} /></Form.Item>
          <Form.Item name="tutar" label="Tutar" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: '100%' }} addonAfter="₺" /></Form.Item>
          {step === 0 && <Button type="primary" htmlType="submit" block>Ödemeyi Başlat</Button>}
        </Form>
        {step === 1 && (
          <Space style={{ marginTop: 8 }}>
            <Button type="primary" onClick={() => onayla()}>Onayla (Başarılı)</Button>
            <Button danger onClick={() => onayla('fail')}>Reddet (Test)</Button>
          </Space>
        )}
      </Card>
      <Typography.Title level={5} style={{ marginTop: 24 }}>Ödemeler</Typography.Title>
      <Table rowKey="id" size="small" dataSource={rows}
        columns={[
          { title: 'Tutar', dataIndex: 'tutar', render: (v) => v?.toFixed(2) },
          { title: 'Durum', dataIndex: 'durum', render: (d) => <Tag color={d === 'BASARILI' ? 'green' : d === 'BASARISIZ' ? 'red' : d === 'IADE' ? 'orange' : 'default'}>{d}</Tag> },
          { title: 'Sağlayıcı', dataIndex: 'saglayici' },
        ]}
      />
    </div>
  );
}
