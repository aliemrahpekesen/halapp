import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, Tag, Typography, message, Popconfirm, Space } from 'antd';
import { api, apiError, getUser } from '../api';

export default function Kullanicilar() {
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const me = getUser();

  const load = () => api.get('/yonetim/kullanicilar').then((r) => setRows(r.data)).catch((e) => message.error(apiError(e)));
  useEffect(() => { load(); }, []);

  const create = async (v: any) => {
    try { await api.post('/yonetim/kullanicilar', v); message.success('Kullanıcı eklendi'); setOpen(false); form.resetFields(); load(); }
    catch (e) { message.error(apiError(e)); }
  };
  const changeRole = async (id: string, role: string) => {
    try { await api.put(`/yonetim/kullanicilar/${id}`, { role }); message.success('Rol güncellendi'); load(); }
    catch (e) { message.error(apiError(e)); }
  };
  const del = async (id: string) => {
    try { await api.delete(`/yonetim/kullanicilar/${id}`); message.success('Silindi'); load(); }
    catch (e) { message.error(apiError(e)); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>Kullanıcılar</Typography.Title>
        <Button type="primary" onClick={() => setOpen(true)}>Yeni Kullanıcı</Button>
      </div>
      <Table rowKey="id" size="small" dataSource={rows}
        columns={[
          { title: 'Ad Soyad', dataIndex: 'fullName' },
          { title: 'E-posta', dataIndex: 'email' },
          { title: 'Rol', dataIndex: 'role', render: (role, r) => <Select size="small" value={role} style={{ width: 130 }} disabled={r.id === me?.id} onChange={(v) => changeRole(r.id, v)} options={['Admin', 'Muhasebe', 'Tahsilatci', 'ReadOnly'].map((x) => ({ value: x, label: x }))} /> },
          { title: 'Durum', dataIndex: 'active', render: (a) => <Tag color={a ? 'green' : 'red'}>{a ? 'Aktif' : 'Pasif'}</Tag> },
          { title: '', render: (_, r) => r.id !== me?.id ? <Popconfirm title="Silinsin mi?" onConfirm={() => del(r.id)}><Button size="small" danger>Sil</Button></Popconfirm> : null },
        ]}
      />
      <Modal title="Yeni Kullanıcı" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={create} initialValues={{ role: 'Muhasebe' }}>
          <Form.Item name="fullName" label="Ad Soyad" rules={[{ required: true, min: 2 }]}><Input /></Form.Item>
          <Form.Item name="email" label="E-posta" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
          <Form.Item name="password" label="Şifre" rules={[{ required: true, min: 6 }]}><Input.Password /></Form.Item>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}><Select options={['Admin', 'Muhasebe', 'Tahsilatci', 'ReadOnly'].map((x) => ({ value: x, label: x }))} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
