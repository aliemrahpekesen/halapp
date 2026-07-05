import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Typography, Tabs, App as AntApp } from 'antd';
import { api, setSession, apiError } from '../api';

export default function Login() {
  const nav = useNavigate();
  const { message } = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const run = (path: string) => async (v: any) => {
    setLoading(true);
    try {
      const { data } = await api.post(path, v);
      setSession(data.token, data.user);
      nav('/');
    } catch (e) { message.error(apiError(e)); } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      <div className="hbx-login-hero" style={{ flex: 1, padding: '56px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/icon.svg" width={40} height={40} />
          <span style={{ fontSize: 24, fontWeight: 700 }}>HalBoxPro</span>
        </div>
        <div>
          <Typography.Title level={2} style={{ color: '#fff', marginBottom: 12 }}>Balık Hali Yönetim Sistemi</Typography.Title>
          <Typography.Paragraph style={{ color: 'rgba(255,255,255,.9)', fontSize: 16, maxWidth: 440 }}>
            Satıştan tahsilata, HKS kesintilerinden e-belgeye, stoktan boş kasa takibine —
            komisyoncu ve tüccarın tüm operasyonu tek platformda.
          </Typography.Paragraph>
          <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
            {['Çok kiracılı', 'e-Fatura / e-Müstahsil', 'Mobil + PWA', 'Rol bazlı yetki'].map((f) => (
              <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,.95)' }}>✓ {f}</span>
            ))}
          </div>
        </div>
        <Typography.Text style={{ color: 'rgba(255,255,255,.6)' }}>© 2026 HalBoxPro</Typography.Text>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, minWidth: 340 }}>
        <div style={{ width: 380, maxWidth: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <Typography.Title level={3} style={{ marginBottom: 2 }}>Hoş geldiniz</Typography.Title>
            <Typography.Text type="secondary">Hesabınıza giriş yapın</Typography.Text>
          </div>
          <Tabs
            centered
            items={[
              {
                key: 'login', label: 'Giriş',
                children: (
                  <Form layout="vertical" onFinish={run('/auth/login')} initialValues={{ tenantSlug: 'demo', email: 'admin@demo.test', password: 'secret1' }}>
                    <Form.Item name="tenantSlug" label="İşletme Kodu" rules={[{ required: true }]}><Input size="large" placeholder="demo" /></Form.Item>
                    <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email' }]}><Input size="large" placeholder="admin@demo.test" /></Form.Item>
                    <Form.Item name="password" label="Şifre" rules={[{ required: true }]}><Input.Password size="large" /></Form.Item>
                    <Button type="primary" size="large" htmlType="submit" block loading={loading} data-testid="login-btn">Giriş Yap</Button>
                  </Form>
                ),
              },
              {
                key: 'register', label: 'Yeni İşletme',
                children: (
                  <Form layout="vertical" onFinish={run('/auth/register')}>
                    <Form.Item name="tenantName" label="İşletme Adı" rules={[{ required: true, min: 2 }]}><Input size="large" /></Form.Item>
                    <Form.Item name="tenantSlug" label="İşletme Kodu" rules={[{ required: true, pattern: /^[a-z0-9-]+$/, message: 'küçük harf/rakam/-' }]}><Input size="large" placeholder="ege" /></Form.Item>
                    <Form.Item name="fullName" label="Ad Soyad" rules={[{ required: true, min: 2 }]}><Input size="large" /></Form.Item>
                    <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email' }]}><Input size="large" /></Form.Item>
                    <Form.Item name="password" label="Şifre" rules={[{ required: true, min: 6 }]}><Input.Password size="large" /></Form.Item>
                    <Button type="primary" size="large" htmlType="submit" block loading={loading}>Kayıt Ol</Button>
                  </Form>
                ),
              },
            ]}
          />
          <Typography.Paragraph type="secondary" style={{ textAlign: 'center', fontSize: 12, marginTop: 12 }}>
            Demo: <b>demo</b> / <b>admin@demo.test</b> / <b>secret1</b>
          </Typography.Paragraph>
        </div>
      </div>
    </div>
  );
}
