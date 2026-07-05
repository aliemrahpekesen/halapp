import { useEffect, useState } from 'react';
import { Card, Table, Button, Form, Select, InputNumber, DatePicker, Input, Space, Tag, Typography, message, Modal } from 'antd';
import dayjs from 'dayjs';
import { api, apiError } from '../api';

const NEXT: Record<string, string[]> = {
  PORTFOYDE: ['TAHSILDE', 'CIRO', 'KARSILIKSIZ'], TAHSILDE: ['ODENDI', 'KARSILIKSIZ', 'PORTFOYDE'],
  CIRO: ['ODENDI', 'KARSILIKSIZ'], KARSILIKSIZ: ['PORTFOYDE'], ODENDI: [],
};

export default function Cekler() {
  const [rows, setRows] = useState<any[]>([]);
  const [cariler, setCariler] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const load = () => api.get('/finans/cekler').then((r) => setRows(r.data));
  useEffect(() => { load(); api.get('/params/cari-hesaplar').then((r) => setCariler(r.data)); }, []);

  const create = async (v: any) => {
    try {
      await api.post('/finans/cekler', { ...v, tutar: Number(v.tutar), tarih: dayjs(v.tarih).format('YYYY-MM-DD'), vadeTarihi: v.vadeTarihi ? dayjs(v.vadeTarihi).format('YYYY-MM-DD') : undefined });
      message.success('Çek eklendi'); setOpen(false); form.resetFields(); load();
    } catch (e) { message.error(apiError(e)); }
  };
  const changeDurum = async (id: string, durum: string) => {
    try { await api.post(`/finans/cekler/${id}/durum`, { durum }); message.success('Durum güncellendi'); load(); }
    catch (e) { message.error(apiError(e)); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Çekler</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>Yeni Çek</Button>
      </div>
      <Table rowKey="id" size="small" dataSource={rows}
        columns={[
          { title: 'Yön', dataIndex: 'yon', render: (y) => <Tag>{y}</Tag> },
          { title: 'Çek No', dataIndex: 'cekNo' },
          { title: 'Tutar', dataIndex: 'tutar', render: (v) => v?.toFixed(2) },
          { title: 'Vade', dataIndex: 'vadeTarihi' },
          { title: 'Durum', dataIndex: 'durum', render: (d) => <Tag color={d === 'ODENDI' ? 'green' : d === 'KARSILIKSIZ' ? 'red' : 'blue'}>{d}</Tag> },
          { title: 'İşlem', render: (_, r) => (NEXT[r.durum] || []).length ? <Select size="small" placeholder="Durum" style={{ width: 130 }} onChange={(v) => changeDurum(r.id, v)} options={(NEXT[r.durum] || []).map((s) => ({ value: s, label: s }))} /> : null },
        ]}
      />
      <Modal title="Yeni Çek" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={create} initialValues={{ yon: 'GIRIS', tarih: dayjs() }}>
          <Form.Item name="yon" label="Yön"><Select options={[{ value: 'GIRIS', label: 'Giriş (Alınan)' }, { value: 'CIKIS', label: 'Çıkış (Verilen)' }]} /></Form.Item>
          <Form.Item name="cariId" label="Cari"><Select allowClear showSearch optionFilterProp="label" options={cariler.map((c) => ({ value: c.id, label: c.unvan }))} /></Form.Item>
          <Form.Item name="cekNo" label="Çek No" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="tutar" label="Tutar" rules={[{ required: true }]}><InputNumber min={0.01} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="tarih" label="Tarih" rules={[{ required: true }]}><DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="vadeTarihi" label="Vade Tarihi"><DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
