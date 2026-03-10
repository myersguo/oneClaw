import React from 'react';
import { Tabs, Empty, Spin, Space } from '@arco-design/web-react';
import { IconCode } from '@arco-design/web-react/icon';
import { useCodeStore } from '../../stores/code-store';
import MonacoEditor from './MonacoEditor';
import { useTranslation } from 'react-i18next';

const EditorPanel: React.FC = () => {
  const { openFiles, activeFileId, closeFile, setActiveFile, reloadFile } = useCodeStore();
  const { t } = useTranslation();

  const handleTabChange = async (key: string) => {
    setActiveFile(key);
    
    // Check if the file is clean (not modified by user)
    // If so, reload it to get latest content from disk (e.g. from background jobs)
    const file = openFiles.find(f => f.id === key);
    if (file) {
        // Smart reload: if file is not dirty (not modified by user), reload it to get latest content
        if (!file.isDirty && !file.loading) {
            await reloadFile(key);
        }
    }
  };

  if (openFiles.length === 0) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff' 
      }}>
        <Empty
          icon={<IconCode style={{ fontSize: 64, color: '#e5e6eb' }} />}
          description={t('code.noFileSelected')}
        />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Tabs
        type="card-gutter"
        activeTab={activeFileId || undefined}
        onChange={handleTabChange}
        editable
        onDeleteTab={closeFile}
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        className="editor-tabs"
        >
        {openFiles.map((file) => {
            return (
            <Tabs.TabPane
            key={file.id}
            title={
                <Space size={4}>
                {file.name}
                {file.isDirty && <span style={{ color: '#ff7d00' }}>●</span>}
                {file.loading && <Spin size={12} />}
                </Space>
            }
            closable
            style={{ height: '100%', position: 'relative' }}
            >
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
                <MonacoEditor file={file} />
            </div>
            </Tabs.TabPane>
        )})}
        </Tabs>
    </div>
  );
};

export default EditorPanel;
