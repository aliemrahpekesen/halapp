import { useEffect, useState } from 'react';
import { Layout, Menu, Dropdown, Avatar, Badge, Button, Grid, List, Typography, Tooltip, Empty } from 'antd';
import {
  DashboardOutlined, ShoppingCartOutlined, DollarOutlined, FileTextOutlined,
  DatabaseOutlined, BarChartOutlined, SettingOutlined, TeamOutlined, LogoutOutlined,
  CreditCardOutlined, BellOutlined, MobileOutlined, UserOutlined, InboxOutlined,
  BulbOutlined, BulbFilled,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api, clearSession, getUser } from '../api';
import { useThemeMode } from '../theme';

const { Header, Sider, Content } = Layout;

export default function AppLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const user = getUser();
  const { mode, toggle } = useThemeMode();
  const [collapsed, setCollapsed] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const screens = Grid.useBreakpoint();

  const loadNotifs = () => {
    api.get('/bildirim/okunmamis-sayisi').then((r) => setUnread(r.data.adet)).catch(() => {});
    api.get('/bildirim').then((r) => setNotifs(r.data)).catch(() => {});
  };
  useEffect(loadNotifs, [loc.pathname]);
  const markRead = () => api.post('/bildirim/tumunu-okundu').then(loadNotifs);

  const items = [
    { key: '/', icon: <DashboardOutlined />, label: 'Panel' },
    { key: '/satis/fisi', icon: <ShoppingCartOutlined />, label: 'Satış Fişi' },
    { key: '/finans/tahsilat', icon: <DollarOutlined />, label: 'Tahsilat / Tediye' },
    { key: '/finans/cekler', icon: <FileTextOutlined />, label: 'Çekler' },
    { key: '/odeme', icon: <CreditCardOutlined />, label: 'Kart Tahsilat' },
    { key: '/stok', icon: <DatabaseOutlined />, label: 'Stok' },
    { key: '/bos-kasa', icon: <InboxOutlined />, label: 'Boş Kasa / Ambalaj' },
    { key: '/ebelge', icon: <FileTextOutlined />, label: 'e-Belge' },
    { key: '/raporlar', icon: <BarChartOutlined />, label: 'Raporlar' },
    {
      key: 'params', icon: <SettingOutlined />, label: 'Parametreler',
      children: [
        { key: '/parametreler/cari-hesaplar', label: 'Cari Hesaplar' },
        { key: '/parametreler/balik-cinsleri', label: 'Balık Cinsleri' },
        { key: '/parametreler/balik-gruplari', label: 'Balık Grupları' },
        { key: '/parametreler/ambalaj-turleri', label: 'Ambalaj Türleri' },
        { key: '/parametreler/kasalar', label: 'Kasalar' },
        { key: '/parametreler/depolar', label: 'Depolar' },
        { key: '/parametreler/bankalar', label: 'Bankalar' },
        { key: '/parametreler/kdv-kodlari', label: 'KDV Kodları' },
        { key: '/parametreler/isyeri', label: 'İşyeri / HKS' },
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

  const notifMenu = (
    <div style={{ width: 320, maxHeight: 420, overflow: 'auto', background: mode === 'dark' ? '#1f1f1f' : '#fff', borderRadius: 8, boxShadow: '0 6px 24px rgba(0,0,0,.15)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid rgba(128,128,128,.15)' }}>
        <Typography.Text strong>Bildirimler</Typography.Text>
        {notifs.length > 0 && <Button type="link" size="small" onClick={markRead}>Tümünü okundu yap</Button>}
      </div>
      {notifs.length === 0
        ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Bildirim yok" style={{ padding: 24 }} />
        : <List size="small" dataSource={notifs.slice(0, 15)} renderItem={(n) => (
            <List.Item style={{ padding: '10px 14px', opacity: n.read ? 0.55 : 1 }}>
              <List.Item.Meta title={<span style={{ fontSize: 13 }}>{n.title}</span>} description={<span style={{ fontSize: 12 }}>{n.body}</span>} />
            </List.Item>
          )} />}
    </div>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} breakpoint="lg" collapsedWidth={screens.xs ? 0 : 80} width={230}>
        <div style={{ height: 56, margin: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/icon.svg" width={30} height={30} />
          {!collapsed && <b style={{ fontSize: 17, letterSpacing: '-.01em' }}>HalBoxPro</b>}
        </div>
        <Menu mode="inline" selectedKeys={[loc.pathname]} defaultOpenKeys={['params', 'yonetim']} items={items}
          style={{ borderInlineEnd: 'none' }} onClick={({ key }) => { if (key.startsWith('/')) nav(key); }} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(128,128,128,.12)' }}>
          <Tooltip title={mode === 'dark' ? 'Aydınlık tema' : 'Karanlık tema'}>
            <Button type="text" icon={mode === 'dark' ? <BulbFilled /> : <BulbOutlined />} onClick={toggle} />
          </Tooltip>
          <Dropdown dropdownRender={() => notifMenu} trigger={['click']} placement="bottomRight">
            <Badge count={unread} size="small"><Button type="text" icon={<BellOutlined />} /></Badge>
          </Dropdown>
          <Dropdown menu={{ items: [{ key: 'out', icon: <LogoutOutlined />, label: 'Çıkış', onClick: () => { clearSession(); nav('/login'); } }] }}>
            <span style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Avatar size="small" style={{ background: '#0891b2' }} icon={<UserOutlined />} />
              {!screens.xs && <span>{user?.fullName} <Typography.Text type="secondary">({user?.role})</Typography.Text></span>}
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: screens.xs ? 10 : 20 }}><Outlet /></Content>
      </Layout>
    </Layout>
  );
}
