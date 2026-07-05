import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Skeleton, Segmented } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, TeamOutlined, FileTextOutlined, RiseOutlined, WalletOutlined, WarningOutlined } from '@ant-design/icons';
import { api } from '../api';
import { BarChart, type BarDatum } from '../components/BarChart';

const money = (v: number) => (v ?? 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard() {
  const [dash, setDash] = useState<any>(null);
  const [mali, setMali] = useState<any>(null);
  const [gunluk, setGunluk] = useState<BarDatum[]>([]);
  const [tur, setTur] = useState<BarDatum[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [d, m, g, b, cins] = await Promise.all([
        api.get('/dashboard'), api.get('/rapor/mali-analiz'), api.get('/rapor/gunluk-analiz'),
        api.get('/satis/gunluk-gelen-balik'), api.get('/params/balik-cinsleri'),
      ]);
      setDash(d.data); setMali(m.data);
      const days = [...g.data].sort((a, b2) => a.tarih.localeCompare(b2.tarih)).slice(-14)
        .map((r: any) => ({ label: r.tarih.slice(5), value: Math.round(r.brut) }));
      setGunluk(days);
      const names: Record<string, string> = Object.fromEntries(cins.data.map((c: any) => [c.id, c.ad]));
      const agg: Record<string, number> = {};
      for (const r of b.data) agg[r.balikCinsId] = (agg[r.balikCinsId] || 0) + r.toplamMiktar;
      setTur(Object.entries(agg).map(([id, v]) => ({ label: names[id] || '—', value: Math.round(v as number) })).sort((a, b2) => b2.value - a.value).slice(0, 8));
      setLoading(false);
    })().catch(() => setLoading(false));
  }, []);

  const kpi = (title: string, value: any, icon: any, suffix?: string, color?: string) => (
    <Col xs={12} md={8} lg={6}>
      <Card className="hbx-card hbx-kpi" styles={{ body: { padding: 18 } }}>
        <Statistic title={<span>{icon} {title}</span>} value={value} suffix={suffix} precision={suffix === '₺' ? 2 : 0} valueStyle={{ color, fontWeight: 600 }} />
      </Card>
    </Col>
  );

  return (
    <div>
      <Typography.Title level={3} style={{ marginTop: 0 }}>Genel Bakış</Typography.Title>
      {loading ? <Skeleton active paragraph={{ rows: 6 }} /> : (
        <>
          <Row gutter={[16, 16]}>
            {kpi('Ciro', mali?.ciro, <RiseOutlined />, '₺', '#0891b2')}
            {kpi('Tahsilat', mali?.tahsilat, <DollarOutlined />, '₺')}
            {kpi('Açık Veresiye', mali?.acikVeresiye, <WarningOutlined />, '₺', '#cf1322')}
            {kpi('Kasa Toplam', mali?.kasaToplam, <WalletOutlined />, '₺')}
            {kpi('Satış Fişi', dash?.satisAdet, <ShoppingCartOutlined />)}
            {kpi('Cari Hesap', dash?.cariAdet, <TeamOutlined />)}
            {kpi('e-Belge', dash?.ebelgeAdet, <FileTextOutlined />)}
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={14}>
              <Card className="hbx-card" title="Günlük Ciro (son 14 gün)">
                <BarChart data={gunluk} format={money} />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card className="hbx-card" title="En Çok Gelen Balık (kg)">
                <BarChart data={tur} />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
