import React from 'react';
import { Form, Input, Button, Select, Typography, Space } from '@arco-design/web-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/app-store';

interface LLMConfigStepProps {
  onNext: () => void;
}

const LLMConfigStep: React.FC<LLMConfigStepProps> = ({ onNext }) => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { setLLMConfig } = useAppStore();

  const handleSubmit = async () => {
    try {
      const values = await form.validate();
      setLLMConfig(values);
      onNext();
    } catch (e) {
      // validation failed
    }
  };

  const handleSkip = () => {
    setLLMConfig(null);
    onNext();
  };

  return (
    <div style={{ padding: '20px 40px' }}>
      <Typography.Title heading={5}>{t('setup.steps.llm.heading')}</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        {t('setup.steps.llm.subheading')}
      </Typography.Text>

      <Form form={form} layout="vertical">
        <Form.Item
          label={t('setup.steps.llm.provider')}
          field="provider"
          initialValue="openai"
          rules={[{ required: true }]}
        >
          <Select placeholder={t('setup.steps.llm.providerPlaceholder')}>
            <Select.Option value="openai">OpenAI</Select.Option>
            <Select.Option value="deepseek">DeepSeek</Select.Option>
            <Select.Option value="doubao">Doubao (Volcengine)</Select.Option>
            <Select.Option value="anthropic">Anthropic</Select.Option>
            <Select.Option value="custom">Custom</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          label={t('setup.steps.llm.apiKey')}
          field="apiKey"
          rules={[{ required: true }]}
        >
          <Input.Password placeholder={t('setup.steps.llm.apiKeyPlaceholder')} />
        </Form.Item>

        <Form.Item
          label={t('setup.steps.llm.modelName')}
          field="modelName"
          initialValue="gpt-4-turbo"
          rules={[{ required: true }]}
        >
          <Input placeholder={t('setup.steps.llm.modelNamePlaceholder')} />
        </Form.Item>

        <Form.Item
          label={t('setup.steps.llm.baseUrl')}
          field="baseUrl"
        >
          <Input placeholder={t('setup.steps.llm.baseUrlPlaceholder')} />
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'right', marginTop: 40 }}>
        <Space>
            <Button onClick={handleSkip}>
                {t('setup.steps.llm.skip')}
            </Button>
            <Button type="primary" onClick={handleSubmit}>
                {t('setup.steps.checkEnv.next')}
            </Button>
        </Space>
      </div>
    </div>
  );
};

export default LLMConfigStep;
