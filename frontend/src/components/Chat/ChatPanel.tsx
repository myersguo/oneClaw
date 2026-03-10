import React, { useEffect, useState } from 'react';
import { Typography, Divider, Button, Space, Drawer, List } from '@arco-design/web-react';
import { IconPlus, IconHistory } from '@arco-design/web-react/icon';
import MessageList from './MessageList';
import InputBox from './InputBox';
import { useChatStore } from '../../stores/chat-store';
import { useTranslation } from 'react-i18next';

const ChatPanel: React.FC = () => {
  const restoreHistory = useChatStore(state => state.restoreHistory);
  const startNewChat = useChatStore(state => state.startNewChat);
  const fetchHistoryList = useChatStore(state => state.fetchHistoryList);
  const historyList = useChatStore(state => state.historyList);
  const loadConversation = useChatStore(state => state.loadConversation);
  
  const [historyVisible, setHistoryVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    restoreHistory();
  }, []);

  const handleNewChat = () => {
      startNewChat();
  };

  const handleOpenHistory = () => {
      fetchHistoryList();
      setHistoryVisible(true);
  };

  const handleSelectHistory = (id: string) => {
      loadConversation(id);
      setHistoryVisible(false);
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff'
    }}>
      {/* 标题 */}
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <Typography.Title heading={6} style={{ margin: 0 }}>
              {t('common.title')}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('common.subtitle')}
            </Typography.Text>
        </div>
        <Space>
            <Button icon={<IconPlus />} shape="circle" size="small" onClick={handleNewChat} />
            <Button icon={<IconHistory />} shape="circle" size="small" onClick={handleOpenHistory} />
        </Space>
      </div>

      <Divider style={{ margin: 0 }} />

      {/* 消息列表（占据剩余空间） */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MessageList />
      </div>

      {/* 输入框（固定底部） */}
      <div style={{ borderTop: '1px solid #e5e6eb' }}>
        <InputBox />
      </div>

      <Drawer
        width={300}
        title={t('chat.historyTitle')}
        visible={historyVisible}
        onOk={() => setHistoryVisible(false)}
        onCancel={() => setHistoryVisible(false)}
        footer={null}
      >
        <List
            dataSource={historyList}
            render={(item) => (
                <List.Item key={item.id} style={{ cursor: 'pointer' }} onClick={() => handleSelectHistory(item.id)}>
                    <List.Item.Meta
                        title={item.title || t('chat.untitled')}
                        description={item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                    />
                </List.Item>
            )}
        />
      </Drawer>
    </div>
  );
};


export default ChatPanel;
