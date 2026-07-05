import { useEffect, useState } from 'react';
import { Table, Typography, Tag } from 'antd';
import { api } from '../api';

export default function AuditLog() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api.get('/yonetim/audit').then((r) => setRows(r.data)); }, []);
  return (
    <div>
      <Typography.Title level={4}>Değişiklik Geçmişi (Audit Log)</Typography.Title>
      <Table rowKey="id" size="small" dataSource={rows}
        columns={[
          { title: 'Tarih', dataIndex: 'createdAt', render: (v) => new Date(v).toLocaleString('tr-TR') },
          { title: 'Kullanıcı', dataIndex: 'userEmail' },
          { title: 'Varlık', dataIndex: 'entity' },
          { title: 'İşlem', dataIndex: 'action', render: (a) => <Tag color={a === 'delete' || a === 'cancel' ? 'red' : a === 'create' || a === 'post' ? 'green' : 'blue'}>{a}</Tag> },
          { title: 'Kayıt', dataIndex: 'entityId', ellipsis: true },
        ]}
      />
    </div>
  );
}
