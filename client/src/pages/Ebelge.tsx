import { useEffect, useState } from 'react';
import { Card, Table, Button, Select, InputNumber, Space, Tag, Typography, message, Modal } from 'antd';
import { api, apiError } from '../api';

export default function Ebelge() {
  const [rows, setRows] = useState<any[]>([]);
  const [tur, setTur] = useState('EFATURA');
  const [tutar, setTutar] = useState<number | null>(1000);
  const [html, setHtml] = useState<string | null>(null);

  const load = () => api.get('/ebelge').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const gonder = async () => {
    try { await api.post('/ebelge/gonder', { tur, tutar: Number(tutar) }); message.success('e-Belge gönderildi (mock)'); load(); }
    catch (e) { message.error(apiError(e)); }
  };
  const gelenSimule = async () => {
    try { await api.post('/ebelge/gelen/simule', { tutar: 500 }); message.success('Gelen belge alındı (mock)'); load(); }
    catch (e) { message.error(apiError(e)); }
  };

  return (
    <div>
      <Typography.Title level={4}>e-Belge <Tag color="orange">Mock Uyumsoft</Tag></Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Select value={tur} onChange={setTur} style={{ width: 180 }} options={[{ value: 'EFATURA', label: 'e-Fatura' }, { value: 'EMUSTAHSIL', label: 'e-Müstahsil' }, { value: 'EIRSALIYE', label: 'e-İrsaliye' }]} />
          <InputNumber value={tutar} onChange={setTutar} min={0} addonAfter="₺" />
          <Button type="primary" onClick={gonder}>Belge Oluştur & Gönder</Button>
          <Button onClick={gelenSimule}>Gelen Belge Simüle Et</Button>
        </Space>
      </Card>
      <Table rowKey="id" size="small" dataSource={rows}
        columns={[
          { title: 'Tür', dataIndex: 'tur' },
          { title: 'Yön', dataIndex: 'yon', render: (y) => <Tag color={y === 'GIDEN' ? 'blue' : 'purple'}>{y}</Tag> },
          { title: 'No', dataIndex: 'no' },
          { title: 'UUID', dataIndex: 'uuid', ellipsis: true },
          { title: 'Tutar', dataIndex: 'tutar', render: (v) => v?.toFixed(2) },
          { title: 'Durum', dataIndex: 'durum', render: (d) => <Tag color={d === 'KABUL' ? 'green' : d === 'RED' ? 'red' : 'default'}>{d}</Tag> },
          { title: '', render: (_, r) => <Button size="small" onClick={() => setHtml(r.html)}>Görüntüle</Button> },
        ]}
      />
      <Modal open={!!html} onCancel={() => setHtml(null)} footer={null} width={700} title="e-Belge Önizleme">
        <iframe title="ebelge" srcDoc={html ?? ''} style={{ width: '100%', height: 400, border: '1px solid #eee' }} />
      </Modal>
    </div>
  );
}
