import React, { useState } from 'react';
import { Select, Input, Space } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';

interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
}

const LogViewer: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [search, setSearch] = useState('');
  const { t } = useTranslation();

  const filteredLogs = logs
    .filter(log => filter === 'all' || log.level === filter)
    .filter(log => !search || log.message.includes(search));

  const getLevelColor = (level: string): string => {
    switch (level) {
      case 'error': return '#f53f3f';
      case 'warn': return '#ff7d00';
      case 'info': return '#00b42a';
      default: return '#fff';
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 过滤器 */}
      <Space style={{ marginBottom: 12, width: '100%' }}>
        <Select
          value={filter}
          onChange={setFilter}
          style={{ width: 120 }}
        >
          <Select.Option value="all">All</Select.Option>
          <Select.Option value="error">Error</Select.Option>
          <Select.Option value="warn">Warn</Select.Option>
          <Select.Option value="info">Info</Select.Option>
        </Select>
        <Input.Search
          placeholder={t('dashboard.searchPlaceholder')}
          value={search}
          onChange={setSearch}
          style={{ flex: 1 }}
        />
      </Space>

      {/* 日志列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        background: '#1d1d1d',
        color: '#fff',
        padding: 12,
        borderRadius: 4,
        fontFamily: 'Monaco, monospace',
        fontSize: 12
      }}>
        {filteredLogs.map((log, index) => (
          <div key={index} style={{ marginBottom: 4, wordBreak: 'break-all' }}>
            <span style={{ color: getLevelColor(log.level) }}>
              [{log.level.toUpperCase()}]
            </span>{' '}
            <span style={{ color: '#888' }}>
              {new Date(log.timestamp).toLocaleTimeString()}
            </span>{' '}
            {log.message}
          </div>
        ))}
        {filteredLogs.length === 0 && (
            <div style={{ color: '#666', textAlign: 'center', marginTop: 20 }}>
                No logs found
            </div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
