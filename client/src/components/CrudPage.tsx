import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, Typography, Popconfirm, message, Space } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api, apiError } from '../api';

export interface FieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select';
  required?: boolean;
  options?: { value: string; label: string }[];
  optionsFrom?: string; // endpoint to load select options {value:id,label:unvan/ad}
  optionLabel?: string;
  step?: number;
}
export interface CrudConfig {
  path: string;
  title: string;
  endpoint: string;
  fields: FieldDef[];
  columns: { key: string; title: string }[];
}

export function CrudPage({ config }: { config: CrudConfig }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [opts, setOpts] = useState<Record<string, any[]>>({});
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    try { setRows((await api.get(config.endpoint)).data); }
    catch (e) { message.error(apiError(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    for (const f of config.fields) {
      if (f.optionsFrom) api.get(f.optionsFrom).then((r) => setOpts((o) => ({ ...o, [f.name]: r.data }))).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.path]);

  const onSubmit = async (values: any) => {
    try {
      if (editing) await api.put(`${config.endpoint}/${editing.id}`, values);
      else await api.post(config.endpoint, values);
      message.success('Kaydedildi');
      setOpen(false); setEditing(null); form.resetFields();
      load();
    } catch (e) { message.error(apiError(e)); }
  };

  const del = async (id: string) => {
    try { await api.delete(`${config.endpoint}/${id}`); message.success('Silindi'); load(); }
    catch (e) { message.error(apiError(e)); }
  };

  const columns = [
    ...config.columns.map((c) => ({ title: c.title, dataIndex: c.key, key: c.key })),
    {
      title: 'İşlem', key: 'op', width: 120,
      render: (_: any, r: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true); }} />
          <Popconfirm title="Silinsin mi?" onConfirm={() => del(r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>{config.title}</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }} data-testid="new-btn">Yeni</Button>
      </div>
      <Table rowKey="id" loading={loading} dataSource={rows} columns={columns} size="small" pagination={{ pageSize: 20 }} />
      <Modal title={editing ? 'Düzenle' : 'Yeni Kayıt'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          {config.fields.map((f) => (
            <Form.Item key={f.name} name={f.name} label={f.label} rules={f.required ? [{ required: true, message: `${f.label} zorunlu` }] : []}>
              {f.type === 'number' ? <InputNumber style={{ width: '100%' }} step={f.step} />
                : f.type === 'select' ? (
                  <Select
                    options={f.options ?? (opts[f.name] ?? []).map((o) => ({ value: o.id, label: o[f.optionLabel ?? 'ad'] ?? o.unvan ?? o.ad }))}
                    allowClear showSearch optionFilterProp="label"
                  />
                ) : <Input />}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  );
}
