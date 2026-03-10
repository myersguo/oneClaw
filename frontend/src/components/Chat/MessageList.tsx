import React, { useRef, useEffect, useState } from 'react';
import { List, Avatar, Typography, Card, Empty, Space } from '@arco-design/web-react';
import { IconRobot, IconUser, IconBulb } from '@arco-design/web-react/icon';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '../../stores/chat-store';
import type { Message } from '../../stores/chat-store';
import ToolCallsDisplay from './ToolCallsDisplay';
import { useTranslation } from 'react-i18next';

const MessageItem: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  const { t } = useTranslation();

  if (isUser) {
    return (
      <List.Item style={{ border: 'none', padding: '10px 0' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'row-reverse',
          gap: 12,
          padding: '0 20px'
        }}>
          <Avatar style={{ backgroundColor: '#3370ff' }}>
            <IconUser />
          </Avatar>
          
          <div style={{ flex: 1, maxWidth: '85%' }}>
            {/* 时间标签 */}
            <Space style={{ marginBottom: 8, flexDirection: 'row-reverse', display: 'flex' }}>
               <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </Typography.Text>
            </Space>

            <Card
              style={{
                backgroundColor: '#e8f3ff',
                border: 'none',
                borderRadius: 8
              }}
              bodyStyle={{ padding: '8px 12px' }}
            >
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              </div>
            </Card>
          </div>
        </div>
      </List.Item>
    );
  }

  const steps = message.steps || [];
  if (steps.length === 0 && (message.content || (message.toolCalls && message.toolCalls.length > 0))) {
      if (message.content) {
          steps.push({ id: 'legacy_content', type: 'text', content: message.content });
      }
      if (message.toolCalls && message.toolCalls.length > 0) {
          steps.push({ id: 'legacy_tools', type: 'tool', toolCalls: message.toolCalls });
      }
  }

  return (
    <List.Item style={{ border: 'none', padding: '10px 20px' }}>
       {steps.map((step, index) => (
           <React.Fragment key={step.id || index}>
               {/* 文本步骤（思考过程） */}
               {step.type === 'text' && step.content && (
                 <div style={{ marginBottom: 16 }}>
                   <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 8, color: '#4e5969' }}>
                     <IconBulb style={{ marginRight: 8, marginTop: 4 }} />
                     <Typography.Text style={{ fontWeight: 500 }}>{t('chat.thinking')}</Typography.Text>
                   </div>
                   
                   <div style={{ 
                       paddingLeft: 24, // 缩进，对齐图标右侧
                       color: '#1d2129' 
                   }}>
                     <div className="markdown-body">
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.content}</ReactMarkdown>
                     </div>
                   </div>
                 </div>
               )}

               {/* 工具步骤 */}
               {step.type === 'tool' && step.toolCalls && step.toolCalls.length > 0 && (
                 <ToolCallsDisplay toolCalls={step.toolCalls} />
               )}
           </React.Fragment>
       ))}
    </List.Item>
  );
};

const MessageList: React.FC = () => {
  const { messages } = useChatStore();
  const listRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const { t } = useTranslation();

  // Check if user is near bottom to enable auto-scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    // If user is within 50px of the bottom, enable auto-scroll
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShouldAutoScroll(isNearBottom);
  };

  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  const prevMessagesLength = useRef(messages.length);
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      setShouldAutoScroll(true);
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty
          icon={<IconRobot style={{ fontSize: 64, color: '#ccc' }} />}
          description={t('chat.emptyDescription')}
        />
      </div>
    );
  }

  return (
    <div 
      ref={listRef}
      onScroll={handleScroll}
      style={{ height: '100%', overflowY: 'auto', padding: '20px 0' }}
    >
      <List>
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </List>
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
