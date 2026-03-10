import React, { useState } from 'react';
import { Form, Input, Switch, Button, Message, Divider, Typography, Space, Modal, Select } from '@arco-design/web-react';
import { useSettingsStore } from '../../stores/settings-store';
import { useAppStore } from '../../stores/app-store';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';

interface SettingsPanelProps {
  onClose?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [form] = Form.useForm();
  const { settings, updateSettings, setLanguage } = useSettingsStore();
  const { resetInitialization } = useAppStore();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  // Load current settings from backend on mount
  React.useEffect(() => {
    const fetchSettings = async () => {
      try {
        const resp = await api.openclaw.getSettings();
        if (resp.data) {
          updateSettings(resp.data);
          form.setFieldsValue(resp.data);
        }
      } catch (e) {
        console.error('Failed to fetch settings:', e);
      }
    };
    fetchSettings();
  }, [form, updateSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = await form.validate();

      // Update local settings
      await updateSettings(values);
      if (values.language) {
          setLanguage(values.language);
      }

      // Sync settings to backend and check if restart is needed
      try {
          const syncResp = await fetch('/api/openclaw/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(values)
          });

          if (syncResp.ok) {
              const data = await syncResp.json();
              if (data.restart) {
                  Message.loading({
                      content: t('settings.restartingGateway') || 'Restarting Gateway to apply LLM configuration changes...',
                      duration: 5000
                  });
                  // Wait for restart
                  await new Promise(resolve => setTimeout(resolve, 5000));
                  window.location.reload();
                  return;
              } else {
                  // Settings saved without restart
                  Message.success(t('settings.savedWithoutRestart') || 'Settings saved successfully');
              }
          }
      } catch (e) {
          console.error('Failed to sync settings', e);
          Message.error(t('settings.syncError') || 'Failed to sync settings to backend');
          return;
      }

      onClose?.();
    } catch (error) {
      Message.error(t('common.error'));
    } finally {
        setSaving(false);
    }
  };

  const handleResetInitialization = () => {
    Modal.confirm({
      title: t('settings.resetTitle'),
      content: t('settings.resetContent'),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: () => {
        resetInitialization();
        Message.success(t('settings.resetSuccess'));
      }
    });
  };

  return (
    <div style={{ padding: '0 20px' }}>
      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
      >
        <Typography.Title heading={6}>{t('settings.general')}</Typography.Title>
        
        <Form.Item
            label={t('settings.languageSelect')}
            field="language"
            rules={[{ required: true }]}
        >
            <Select>
                <Select.Option value="en">English</Select.Option>
                <Select.Option value="zh">中文</Select.Option>
            </Select>
        </Form.Item>

        <Divider />

        <Typography.Title heading={6}>{t('settings.llm')}</Typography.Title>

        <Form.Item
          label="Provider"
          field="llmProvider"
          rules={[{ required: true, message: t('common.error') }]}
          initialValue="openai"
        >
          <Select placeholder="Select Provider">
            <Select.Option value="openai">OpenAI</Select.Option>
            <Select.Option value="deepseek">DeepSeek</Select.Option>
            <Select.Option value="doubao">Doubao (Volcengine)</Select.Option>
            <Select.Option value="anthropic">Anthropic</Select.Option>
            <Select.Option value="miaoda">Miaoda</Select.Option>
            <Select.Option value="custom">Custom</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="API Key"
          field="openaiApiKey"
          rules={[{ required: true, message: t('common.error') }]}
        >
          <Input.Password placeholder="sk-..." />
        </Form.Item>

        <Form.Item
          label="Model Name"
          field="openaiModel"
          rules={[{ required: true, message: t('common.error') }]}
        >
          <Input placeholder="gpt-4-turbo / claude-3-5-sonnet-20241022 / deepseek-chat" />
        </Form.Item>

        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -16, marginBottom: 16 }}>
          OpenAI, Anthropic, DeepSeek compatible API
        </Typography.Text>

        <Form.Item shouldUpdate={(prev, next) => prev.llmProvider !== next.llmProvider} noStyle>
          {(values) => {
             return values.llmProvider !== 'miaoda' ? (
                <>
                <Form.Item
                  label="Base URL"
                  field="openaiBaseUrl"
                  rules={[{ required: values.llmProvider === 'custom', message: t('common.error') }]}
                >
                  <Input placeholder="https://api.openai.com/v1" />
                </Form.Item>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: -16, marginBottom: 16 }}>
                  OpenAI: https://api.openai.com/v1<br />
                  DeepSeek: https://api.deepseek.com<br />
                  Others: Check provider docs
                </Typography.Text>
                </>
             ) : null;
          }}
        </Form.Item>

        <Divider />

        <Typography.Title heading={6}>Workspace</Typography.Title>

        <Form.Item
          label="Workspace Path"
          field="workspacePath"
          rules={[{ required: true, message: t('common.error') }]}
        >
          <Input placeholder="~/openclaw-workspace" disabled />
        </Form.Item>

        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Set during initialization. Re-initialize to change.
        </Typography.Text>

        <Divider />

        <Typography.Title heading={6}>Other Settings</Typography.Title>

        <Form.Item
          label="Auto Start Gateway"
          field="autoStartGateway"
          triggerPropName="checked"
        >
          <Switch />
        </Form.Item>

        <Divider />

        <Typography.Title heading={6}>Advanced</Typography.Title>

        <Button type="text" status="danger" onClick={handleResetInitialization}>
          Reset Initialization
        </Button>
        <div style={{ marginTop: 8 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            This will restart the setup wizard.
          </Typography.Text>
        </div>

        <Form.Item style={{ marginTop: 40 }}>
          <Space>
            <Button type="primary" onClick={handleSave} loading={saving}>
              {t('common.save')}
            </Button>
            <Button onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SettingsPanel;
