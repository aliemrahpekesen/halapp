import { useEffect, useState } from 'react';
import { Card, Table, Button, Form, Select, InputNumber, DatePicker, Segmented, Typography, Tag, Empty, App as AntApp } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api, apiError } from '../api';

export default function BosKasa() {
  const { message } = AntApp.useApp();
  const [form] = Form.useForm();
  const [turler, setTurler] = useState<any[]>([]);
  const [cariler, setCariler] = useState<any[]>([]);
  const [bakiye, setBakiye] = useState<any[]>([]);
  const [yon, setYon] = useState<'VERILEN' | 'IADE'>('VERILEN');

  const load = () => api.get('/ambalaj/bakiye').then((r) => setBakiye(r.data));
  useEffect(() => {
    api.get('/ambalaj/turleri').then((r) => setTurler(r.data));
    api.get('/params/cari-hesaplar').then((r) => setCariler(r.data));
    load();
  }, []);

  const turAd = (id: string) => turler.find((t) => t.id === id)?.ad || id;
  const cariAd = (id: string) => cariler.find((c) => c.id === id)?.unvan || id;

  const submit = async (v: any) => {
    try {
      await api.post('/ambalaj/hareket', { tarih: dayjs(v.tarih).format('YYYY-MM-DD'), cariId: v.cariId, ambalajTuruId: v.ambalajTuruId, yon, adet: Number(v.adet) });
      message.success(yon === 'VERILEN' ? 'Kasa çıkışı kaydedildi' : 'İade kaydedildi');
      form.resetFields(['adet']); load();
    } catch (e) { message.error(apiError(e)); }
  };

  const toplamAcik = bakiye.reduce((a, r) => a + r.bakiye, 0);

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0 }}><InboxOutlined /> Boş Kasa / Ambalaj Takibi</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        Alıcılara verilen ve iade alınan kasaları takip edin; kimde ne kadar açık kap kaldığını görün.
      </Typography.Paragraph>

      <Card className="hbx-card" style={{ maxWidth: 560, marginBottom: 16 }}>
        <Segmented block options={[{ value: 'VERILEN', label: 'Kasa Ver (Çıkış)' }, { value: 'IADE', label: 'İade Al (Giriş)' }]} value={yon} onChange={(x) => setYon(x as any)} style={{ marginBottom: 16 }} />
        <Form form={form} layout="vertical" onFinish={submit} initialValues={{ tarih: dayjs() }}>
          <Form.Item name="cariId" label="Cari (Alıcı)" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" placeholder="Cari seçin" options={cariler.map((c) => ({ value: c.id, label: c.unvan }))} />
          </Form.Item>
          <Form.Item name="ambalajTuruId" label="Ambalaj Türü" rules={[{ required: true }]}>
            <Select placeholder="Tür seçin" options={turler.map((t) => ({ value: t.id, label: `${t.ad}${t.depozito ? ` (${t.depozito}₺ depozito)` : ''}` }))} notFoundContent="Önce Parametreler → Ambalaj Türleri ekleyin" />
          </Form.Item>
          <Form.Item name="adet" label="Adet" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="tarih" label="Tarih" rules={[{ required: true }]}><DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} /></Form.Item>
          <Button type="primary" htmlType="submit" block>Kaydet</Button>
        </Form>
      </Card>

      <Card className="hbx-card" title="Açık Kap Bakiyeleri" extra={<Tag color={toplamAcik > 0 ? 'orange' : 'green'}>Toplam açık: {toplamAcik} kap</Tag>}>
        {bakiye.length === 0
          ? <Empty description="Açık kap yok — tüm kasalar iade edilmiş" />
          : <Table rowKey={(r) => r.cariId + r.ambalajTuruId} size="small" pagination={false} dataSource={bakiye}
              columns={[
                { title: 'Cari', dataIndex: 'cariId', render: cariAd },
                { title: 'Ambalaj', dataIndex: 'ambalajTuruId', render: turAd },
                { title: 'Açık Kap', dataIndex: 'bakiye', align: 'right', render: (v) => <b style={{ color: v > 0 ? '#d46b08' : '#389e0d' }}>{v}</b> },
              ]} />}
      </Card>
    </div>
  );
}
