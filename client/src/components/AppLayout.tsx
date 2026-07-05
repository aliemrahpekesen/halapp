import { useEffect, useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Badge, Button, Grid } from 'antd';
import {
  DashboardOutlined, ShoppingCartOutlined, DollarOutlined, FileTextOutlined,
  DatabaseOutlined, BarChartOutlined, SettingOutlined, TeamOutlined, LogoutOutlined,
  CreditCardOutlined, BellOutlined, MobileOutlined, UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api, clearSession, getUser } from '../api';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const user = getUser();
  const [collapsed, setCollapsed] = useState(false);
  const [unread, setUnread] = useState(0);
  const screens = Grid.useBreakpoint();

  useEffect(() => {
    api.get('/bildirim/okunmamis-sayisi').then((r) => setUnread(r.data.adet)).catch(() => {});
  }, [loc.pathname]);

  const items = [
    { key: '/', icon: <DashboardOutlined />, label: 'Panel' },
    { key: '/satis/fisi', icon: <ShoppingCartOutlined />, label: 'Satış Fişi' },
    { key: '/finans/tahsilat', icon: <DollarOutlined />, label: 'Tahsilat / Tediye' },
    { key: '/finans/cekler', icon: <FileTextOutlined />, label: 'Çekler' },
    { key: '/odeme', icon: <CreditCardOutlined />, label: 'Kart Tahsilat' },
    { key: '/stok', icon: <DatabaseOutlined />, label: 'Stok' },
    { key: '/ebelge', icon: <FileTextOutlined />, label: 'e-Belge' },
    { key: '/raporlar', icon: <BarChartOutlined />, label: 'Raporlar' },
    {
      key: 'params', icon: <SettingOutlined />, label: 'Parametreler',
      children: [
        { key: '/parametreler/cari-hesaplar', label: 'Cari Hesaplar' },
        { key: '/parametreler/balik-cinsleri', label: 'Balık Cinsleri' },
        { key: '/parametreler/balik-gruplari', label: 'Balık Grupları' },
        { key: '/parametreler/kasalar', label: 'Kasalar' },
        { key: '/parametreler/depolar', label: 'Depolar' },
        { key: '/parametreler/bankalar', label: 'Bankalar' },
        { key: '/parametreler/kdv-kodlari', label: 'KDV Kodları' },
        { key: '/parametreler/isyeri', label: 'İşyeri' },
      ],
    },
    {
      key: 'yonetim', icon: <TeamOutlined />, label: 'Yönetim',
      children: [
        { key: '/yonetim/kullanicilar', label: 'Kullanıcılar' },
        { key: '/yonetim/audit', label: 'Değişiklik Geçmişi' },
      ],
    },
    { key: '/mobil', icon: <MobileOutlined />, label: 'Mobil Görünüm' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg" collapsedWidth={screens.xs ? 0 : 80} theme="light">
        <div style={{ height: 48, margin: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/icon.svg" width={28} height={28} />
          {!collapsed && <b style={{ fontSize: 16 }}>HalBoxPro</b>}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[loc.pathname]}
          defaultOpenKeys={['params', 'yonetim']}
          items={items}
          onClick={({ key }) => { if (key.startsWith('/')) nav(key); }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
          <Badge count={unread} size="small"><Button type="text" icon={<BellOutlined />} /></Badge>
          <Dropdown menu={{ items: [{ key: 'out', icon: <LogoutOutlined />, label: 'Çıkış', onClick: () => { clearSession(); nav('/login'); } }] }}>
            <span style={{ cursor: 'pointer' }}><Avatar size="small" icon={<UserOutlined />} /> {user?.fullName} <span style={{ color: '#999' }}>({user?.role})</span></span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16 }}><Outlet /></Content>
      </Layout>
    </Layout>
  );
}
