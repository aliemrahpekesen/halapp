import { useEffect, useState } from 'react';
import { Card, Table, Tabs, Button, Typography, Statistic, Row, Col } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { api, getToken } from '../api';

function download(rapor: string) {
  const a = document.createElement('a');
  a.href = `/api/rapor/export?rapor=${rapor}`;
  // token via fetch to include auth, then blob
  fetch(a.href, { headers: { Authorization: `Bearer ${getToken()}` } })
    .then((r) => r.blob()).then((b) => {
      const url = URL.createObjectURL(b);
      const link = document.createElement('a'); link.href = url; link.download = `${rapor}.csv`; link.click();
      URL.revokeObjectURL(url);
    });
}

export default function Raporlar() {
  const [komisyon, setKomisyon] = useState<any>(null);
  const [mizan, setMizan] = useState<any[]>([]);
  const [mali, setMali] = useState<any>(null);

  useEffect(() => {
    api.get('/rapor/komisyon').then((r) => setKomisyon(r.data));
    api.get('/rapor/mizan').then((r) => setMizan(r.data));
    api.get('/rapor/mali-analiz').then((r) => setMali(r.data));
  }, []);

  return (
    <div>
      <Typography.Title level={4}>Raporlar</Typography.Title>
      {mali && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}><Card><Statistic title="Ciro" value={mali.ciro} suffix="₺" precision={2} /></Card></Col>
          <Col span={6}><Card><Statistic title="Tahsilat" value={mali.tahsilat} suffix="₺" precision={2} /></Card></Col>
          <Col span={6}><Card><Statistic title="Açık Veresiye" value={mali.acikVeresiye} suffix="₺" precision={2} /></Card></Col>
          <Col span={6}><Card><Statistic title="Kasa" value={mali.kasaToplam} suffix="₺" precision={2} /></Card></Col>
        </Row>
      )}
      <Tabs items={[
        {
          key: 'komisyon', label: 'Komisyon Raporu',
          children: (
            <>
              <Button icon={<DownloadOutlined />} onClick={() => download('komisyon')} style={{ marginBottom: 8 }}>CSV İndir</Button>
              <Table rowKey="no" size="small" dataSource={komisyon?.satirlar ?? []}
                columns={[{ title: 'No', dataIndex: 'no' }, { title: 'Tarih', dataIndex: 'tarih' }, { title: 'Brüt', dataIndex: 'brut' }, { title: 'Komisyon', dataIndex: 'komisyon' }, { title: 'Rüsum', dataIndex: 'rusum' }, { title: 'Stopaj', dataIndex: 'stopaj' }, { title: 'Net', dataIndex: 'net' }]}
                summary={() => komisyon?.toplam ? (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}><b>Toplam</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={2}><b>{komisyon.toplam.brut.toFixed(2)}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={3}><b>{komisyon.toplam.komisyon.toFixed(2)}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={4}><b>{komisyon.toplam.rusum.toFixed(2)}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={5}><b>{komisyon.toplam.stopaj.toFixed(2)}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={6}><b>{komisyon.toplam.net.toFixed(2)}</b></Table.Summary.Cell>
                  </Table.Summary.Row>
                ) : null}
              />
            </>
          ),
        },
        {
          key: 'mizan', label: 'Mizan',
          children: (
            <>
              <Button icon={<DownloadOutlined />} onClick={() => download('mizan')} style={{ marginBottom: 8 }}>CSV İndir</Button>
              <Table rowKey="cariId" size="small" dataSource={mizan}
                columns={[{ title: 'Cari', dataIndex: 'cariId', ellipsis: true }, { title: 'Borç', dataIndex: 'borc' }, { title: 'Alacak', dataIndex: 'alacak' }, { title: 'Bakiye', dataIndex: 'bakiye' }]} />
            </>
          ),
        },
      ]} />
    </div>
  );
}
