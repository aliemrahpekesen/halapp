import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, TeamOutlined, FileTextOutlined } from '@ant-design/icons';
import { api } from '../api';

export default function Dashboard() {
  const [dash, setDash] = useState<any>(null);
  const [mali, setMali] = useState<any>(null);

  useEffect(() => {
    api.get('/dashboard').then((r) => setDash(r.data)).catch(() => {});
    api.get('/rapor/mali-analiz').then((r) => setMali(r.data)).catch(() => {});
  }, []);

  if (!dash) return <Spin />;

  return (
    <div>
      <Typography.Title level={3}>Genel Bakış</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><Card><Statistic title="Satış Fişi" value={dash.satisAdet} prefix={<ShoppingCartOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Kasa Toplam" value={dash.kasaToplam} suffix="₺" prefix={<DollarOutlined />} precision={2} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Cari Hesap" value={dash.cariAdet} prefix={<TeamOutlined />} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="e-Belge" value={dash.ebelgeAdet} prefix={<FileTextOutlined />} /></Card></Col>
      </Row>
      {mali && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={12} md={6}><Card><Statistic title="Ciro" value={mali.ciro} suffix="₺" precision={2} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="Tahsilat" value={mali.tahsilat} suffix="₺" precision={2} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="Açık Veresiye" value={mali.acikVeresiye} suffix="₺" precision={2} valueStyle={{ color: '#cf1322' }} /></Card></Col>
          <Col xs={12} md={6}><Card><Statistic title="Kasa" value={mali.kasaToplam} suffix="₺" precision={2} /></Card></Col>
        </Row>
      )}
    </div>
  );
}
