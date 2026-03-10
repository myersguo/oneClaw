import React, { useState } from 'react';
import { Input, Button, Tooltip } from '@arco-design/web-react';
import { IconSend } from '@arco-design/web-react/icon';
import { useChatStore } from '../../stores/chat-store';
import { useTranslation } from 'react-i18next';

const InputBox: React.FC = () => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [focused, setFocused] = useState(false);
  const { sendMessage } = useChatStore();
  const { t } = useTranslation();

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(input);
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ padding: '16px 20px', backgroundColor: '#fff', borderTop: '1px solid #e5e6eb' }}>
      <div 
        style={{
          border: `1px solid ${focused ? 'rgb(22,93,255)' : '#e5e6eb'}`,
          borderRadius: 12,
          padding: '12px',
          backgroundColor: '#fff',
          transition: 'all 0.2s',
          boxShadow: focused ? '0 0 0 2px rgba(22,93,255,0.1)' : 'none',
          position: 'relative'
        }}
      >
        <Input.TextArea
          placeholder={t('chat.inputPlaceholder')}
          value={input}
          onChange={setInput}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoSize={{ minRows: 2, maxRows: 8 }}
          style={{ 
            border: 'none', 
            background: 'transparent', 
            padding: 0, 
            resize: 'none',
            outline: 'none',
            fontSize: 14,
            lineHeight: 1.5,
            marginBottom: 32 // Space for button
          }}
        />
        
        <div style={{ position: 'absolute', right: 12, bottom: 8 }}>
          <Tooltip content={t('chat.sendMessage')}>
            <Button
              type="primary"
              shape="circle"
              icon={<IconSend />}
              onClick={handleSend}
              loading={sending}
              disabled={!input.trim()}
              style={{ 
                width: 32, 
                height: 32,
                transition: 'all 0.2s',
                opacity: input.trim() ? 1 : 0.6
              }}
            />
          </Tooltip>
        </div>
      </div>
      
      <div style={{ 
        marginTop: 8, 
        textAlign: 'center', 
        fontSize: 12, 
        color: '#86909c' 
      }}>
        {t('chat.aiDisclaimer')}
      </div>
    </div>
  );
};

export default InputBox;
