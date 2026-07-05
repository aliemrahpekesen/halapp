import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, message, Tabs } from 'antd';
import { api, setSession, apiError } from '../api';

export default function Login() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  const doLogin = async (v: any) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', v);
      setSession(data.token, data.user);
      nav('/');
    } catch (e) {
      message.error(apiError(e));
    } finally { setLoading(false); }
  };

  const doRegister = async (v: any) => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', v);
      setSession(data.token, data.user);
      nav('/');
    } catch (e) {
      message.error(apiError(e));
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
      <Card style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img src="/icon.svg" width={56} height={56} alt="logo" />
          <Typography.Title level={3} style={{ marginTop: 8, marginBottom: 0 }}>HalBoxPro</Typography.Title>
          <Typography.Text type="secondary">Balık Hali Yönetim Sistemi</Typography.Text>
        </div>
        <Tabs
          items={[
            {
              key: 'login', label: 'Giriş',
              children: (
                <Form layout="vertical" onFinish={doLogin} initialValues={{ tenantSlug: 'demo', email: 'admin@demo.test', password: 'secret1' }}>
                  <Form.Item name="tenantSlug" label="İşletme Kodu" rules={[{ required: true }]}><Input placeholder="demo" /></Form.Item>
                  <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email' }]}><Input placeholder="admin@demo.test" /></Form.Item>
                  <Form.Item name="password" label="Şifre" rules={[{ required: true }]}><Input.Password /></Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading} data-testid="login-btn">Giriş Yap</Button>
                </Form>
              ),
            },
            {
              key: 'register', label: 'Yeni İşletme',
              children: (
                <Form layout="vertical" onFinish={doRegister}>
                  <Form.Item name="tenantName" label="İşletme Adı" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
                  <Form.Item name="tenantSlug" label="İşletme Kodu" rules={[{ required: true, pattern: /^[a-z0-9-]+$/, message: 'küçük harf/rakam/-' }]}><Input placeholder="ege" /></Form.Item>
                  <Form.Item name="fullName" label="Ad Soyad" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
                  <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
                  <Form.Item name="password" label="Şifre" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>Kayıt Ol</Button>
                </Form>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
