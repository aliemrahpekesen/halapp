import { useEffect, useState } from 'react';
import { List, Card, Button, Form, Select, InputNumber, message, Typography, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api, apiError, getUser, clearSession } from '../api';

/** Simplified mobile surface for field use (tahsilat + balances). */
export default function Mobil() {
  const nav = useNavigate();
  const [cariler, setCariler] = useState<any[]>([]);
  const [kasalar, setKasalar] = useState<any[]>([]);
  const [form] = Form.useForm();
  const user = getUser();

  const load = () => {
    api.get('/params/cari-hesaplar').then((r) => setCariler(r.data));
    api.get('/params/kasalar').then((r) => setKasalar(r.data));
  };
  useEffect(load, []);

  const tahsil = async (v: any) => {
    try {
      await api.post('/finans/tahsil', { tarih: new Date().toISOString().slice(0, 10), cariId: v.cariId, kasaId: v.kasaId, tutar: Number(v.tutar) });
      message.success('Tahsilat kaydedildi');
      form.resetFields(['tutar']); load();
    } catch (e) { message.error(apiError(e)); }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 12, minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>📱 HalBoxPro Mobil</Typography.Title>
        <Button size="small" onClick={() => { clearSession(); nav('/login'); }}>Çıkış</Button>
      </div>
      <Typography.Text type="secondary">{user?.fullName} · {user?.role}</Typography.Text>

      <Card title="Hızlı Tahsilat" style={{ marginTop: 12 }} size="small">
        <Form form={form} layout="vertical" onFinish={tahsil}>
          <Form.Item name="cariId" label="Cari" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={cariler.map((c) => ({ value: c.id, label: c.unvan }))} /></Form.Item>
          <Form.Item name="kasaId" label="Kasa" rules={[{ required: true }]}><Select options={kasalar.map((k) => ({ value: k.id, label: k.ad }))} /></Form.Item>
          <Form.Item name="tutar" label="Tutar" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: '100%' }} addonAfter="₺" /></Form.Item>
          <Button type="primary" htmlType="submit" block size="large" data-testid="mobil-tahsil">Tahsilatı Kaydet</Button>
        </Form>
      </Card>

      <Card title="Cari Bakiyeler" style={{ marginTop: 12 }} size="small">
        <List size="small" dataSource={cariler}
          renderItem={(c) => (
            <List.Item>
              <span>{c.unvan} <Tag>{c.tip}</Tag></span>
              <b style={{ color: c.bakiye > 0 ? '#cf1322' : '#3f8600' }}>{c.bakiye?.toFixed(2)} ₺</b>
            </List.Item>
          )}
        />
      </Card>
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <Button type="link" onClick={() => nav('/')}>Masaüstü Görünüme Geç →</Button>
      </div>
    </div>
  );
}
