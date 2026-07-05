import { useEffect, useState } from 'react';
import { List, Card, Button, Form, Select, InputNumber, Typography, Tag, Segmented, App as AntApp } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api, apiError, getUser, clearSession } from '../api';

/** Field-use mobile surface: quick collection/payment + live balances. */
export default function Mobil() {
  const nav = useNavigate();
  const { message } = AntApp.useApp();
  const [cariler, setCariler] = useState<any[]>([]);
  const [kasalar, setKasalar] = useState<any[]>([]);
  const [tur, setTur] = useState<'tahsil' | 'tediye'>('tahsil');
  const [form] = Form.useForm();
  const user = getUser();

  const load = () => {
    api.get('/params/cari-hesaplar').then((r) => setCariler(r.data));
    api.get('/params/kasalar').then((r) => setKasalar(r.data));
  };
  useEffect(load, []);

  const submit = async (v: any) => {
    try {
      await api.post(`/finans/${tur}`, { tarih: new Date().toISOString().slice(0, 10), cariId: v.cariId, kasaId: v.kasaId, tutar: Number(v.tutar) });
      message.success(tur === 'tahsil' ? 'Tahsilat kaydedildi' : 'Tediye kaydedildi');
      form.resetFields(['tutar']); load();
    } catch (e) { message.error(apiError(e)); }
  };

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(150deg,#0891b2,#06b6d4)', color: '#fff', padding: '16px 18px', borderRadius: '0 0 18px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src="/icon.svg" width={26} height={26} />
            <b style={{ fontSize: 17 }}>HalBoxPro Mobil</b>
          </div>
          <Button size="small" ghost icon={<LogoutOutlined />} onClick={() => { clearSession(); nav('/login'); }} />
        </div>
        <Typography.Text style={{ color: 'rgba(255,255,255,.85)', fontSize: 12 }}>{user?.fullName} · {user?.role}</Typography.Text>
      </div>

      <div style={{ padding: 12 }}>
        <Card size="small" className="hbx-card" title="Hızlı Tahsilat / Tediye" style={{ marginBottom: 12 }}>
          <Segmented block options={[{ value: 'tahsil', label: 'Tahsilat' }, { value: 'tediye', label: 'Tediye' }]} value={tur} onChange={(x) => setTur(x as any)} style={{ marginBottom: 12 }} />
          <Form form={form} layout="vertical" onFinish={submit}>
            <Form.Item name="cariId" label="Cari" rules={[{ required: true }]}><Select size="large" showSearch optionFilterProp="label" options={cariler.map((c) => ({ value: c.id, label: c.unvan }))} /></Form.Item>
            <Form.Item name="kasaId" label="Kasa" rules={[{ required: true }]}><Select size="large" options={kasalar.map((k) => ({ value: k.id, label: k.ad }))} /></Form.Item>
            <Form.Item name="tutar" label="Tutar" rules={[{ required: true }]}><InputNumber size="large" min={0.01} style={{ width: '100%' }} addonAfter="₺" /></Form.Item>
            <Button type="primary" htmlType="submit" block size="large" data-testid="mobil-tahsil">Kaydet</Button>
          </Form>
        </Card>

        <Card size="small" className="hbx-card" title="Cari Bakiyeler">
          <List size="small" dataSource={cariler}
            renderItem={(c) => (
              <List.Item>
                <span>{c.unvan} <Tag>{c.tip}</Tag></span>
                <b className="num" style={{ color: c.bakiye > 0 ? '#cf1322' : '#3f8600' }}>{(c.bakiye ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</b>
              </List.Item>
            )}
          />
        </Card>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Button type="link" onClick={() => nav('/')}>Masaüstü Görünüme Geç →</Button>
        </div>
      </div>
    </div>
  );
}
