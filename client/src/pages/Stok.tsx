import { useEffect, useState } from 'react';
import { Card, Table, Button, Form, Select, InputNumber, DatePicker, Space, Typography, message, Tabs } from 'antd';
import dayjs from 'dayjs';
import { api, apiError } from '../api';

export default function StokPage() {
  const [bakiye, setBakiye] = useState<any[]>([]);
  const [depolar, setDepolar] = useState<any[]>([]);
  const [cinsler, setCinsler] = useState<any[]>([]);
  const [form] = Form.useForm();
  const [tform] = Form.useForm();

  const load = () => api.get('/stok/bakiye').then((r) => setBakiye(r.data));
  useEffect(() => {
    load();
    api.get('/params/depolar').then((r) => setDepolar(r.data));
    api.get('/params/balik-cinsleri').then((r) => setCinsler(r.data));
  }, []);

  const cinsAd = (id: string) => cinsler.find((c) => c.id === id)?.ad || id;
  const depoAd = (id: string) => depolar.find((d) => d.id === id)?.ad || id;

  const hareket = async (v: any) => {
    try { await api.post('/stok/hareket', { ...v, miktar: Number(v.miktar), tarih: dayjs(v.tarih).format('YYYY-MM-DD') }); message.success('Hareket kaydedildi'); form.resetFields(['miktar']); load(); }
    catch (e) { message.error(apiError(e)); }
  };
  const transfer = async (v: any) => {
    try { await api.post('/stok/transfer', { ...v, miktar: Number(v.miktar), tarih: dayjs(v.tarih).format('YYYY-MM-DD') }); message.success('Transfer yapıldı'); tform.resetFields(['miktar']); load(); }
    catch (e) { message.error(apiError(e)); }
  };

  return (
    <div>
      <Typography.Title level={4}>Stok</Typography.Title>
      <Tabs items={[
        {
          key: 'bakiye', label: 'Bakiye',
          children: <Table rowKey={(r) => r.depoId + r.balikCinsId} size="small" dataSource={bakiye}
            columns={[{ title: 'Depo', dataIndex: 'depoId', render: depoAd }, { title: 'Balık', dataIndex: 'balikCinsId', render: cinsAd }, { title: 'Bakiye (kg)', dataIndex: 'bakiye' }]} />,
        },
        {
          key: 'hareket', label: 'Hareket Girişi',
          children: (
            <Card style={{ maxWidth: 480 }}>
              <Form form={form} layout="vertical" onFinish={hareket} initialValues={{ yon: 'GIRIS', tarih: dayjs() }}>
                <Form.Item name="depoId" label="Depo" rules={[{ required: true }]}><Select options={depolar.map((d) => ({ value: d.id, label: d.ad }))} /></Form.Item>
                <Form.Item name="balikCinsId" label="Balık" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={cinsler.map((c) => ({ value: c.id, label: c.ad }))} /></Form.Item>
                <Form.Item name="yon" label="Yön"><Select options={[{ value: 'GIRIS', label: 'Giriş' }, { value: 'CIKIS', label: 'Çıkış' }]} /></Form.Item>
                <Form.Item name="miktar" label="Miktar (kg)" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="tarih" label="Tarih" rules={[{ required: true }]}><DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} /></Form.Item>
                <Button type="primary" htmlType="submit" block>Kaydet</Button>
              </Form>
            </Card>
          ),
        },
        {
          key: 'transfer', label: 'Transfer',
          children: (
            <Card style={{ maxWidth: 480 }}>
              <Form form={tform} layout="vertical" onFinish={transfer} initialValues={{ tarih: dayjs() }}>
                <Form.Item name="kaynakDepoId" label="Kaynak Depo" rules={[{ required: true }]}><Select options={depolar.map((d) => ({ value: d.id, label: d.ad }))} /></Form.Item>
                <Form.Item name="hedefDepoId" label="Hedef Depo" rules={[{ required: true }]}><Select options={depolar.map((d) => ({ value: d.id, label: d.ad }))} /></Form.Item>
                <Form.Item name="balikCinsId" label="Balık" rules={[{ required: true }]}><Select showSearch optionFilterProp="label" options={cinsler.map((c) => ({ value: c.id, label: c.ad }))} /></Form.Item>
                <Form.Item name="miktar" label="Miktar (kg)" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="tarih" label="Tarih" rules={[{ required: true }]}><DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} /></Form.Item>
                <Button type="primary" htmlType="submit" block>Transfer Et</Button>
              </Form>
            </Card>
          ),
        },
      ]} />
    </div>
  );
}
