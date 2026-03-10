import React from 'react';
import { Table, Badge, Tag, Space } from '@arco-design/web-react';

interface Device {
  id: string;
  name: string;
  type: string;
  online: boolean;
  lastSeen: number;
}

const DeviceList: React.FC<{ devices: any[] }> = ({ devices }) => {
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (name: string, record: Device) => (
        <Space>
          <Badge status={record.online ? 'success' : 'default'} />
          {name}
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (type: string) => <Tag>{type}</Tag>
    },
    {
      title: 'Last Seen',
      dataIndex: 'lastSeen',
      render: (time: number) => new Date(time).toLocaleString()
    }
  ];

  return (
    <Table
      columns={columns}
      data={devices}
      pagination={false}
      size="small"
      scroll={{ y: 300 }}
    />
  );
};

export default DeviceList;
