import React, { useState } from 'react';
import { Form, Input, Button, Space, Typography } from '@arco-design/web-react';
import { IconFolder } from '@arco-design/web-react/icon';
import { useOpenClawStore } from '../../stores/openclaw-store';
import { useTranslation } from 'react-i18next';

interface SelectWorkspaceStepProps {
  onNext: () => void;
}

const SelectWorkspaceStep: React.FC<SelectWorkspaceStepProps> = ({ onNext }) => {
  const [form] = Form.useForm();
  const setWorkspacePath = useOpenClawStore(state => state.setWorkspacePath);
  const [path, setPath] = useState('~/openclaw-workspace');
  const { t } = useTranslation();

  const handleSubmit = async () => {
    try {
      await form.validate();
      setWorkspacePath(path); // Save to store/localstorage
      onNext();
    } catch (e) {
      // validation failed
    }
  };

  return (
    <div style={{ padding: '20px 40px' }}>
      <Typography.Title heading={5}>{t('setup.steps.workspace.heading')}</Typography.Title>
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 20 }}>
        {t('setup.steps.workspace.subheading')}
      </Typography.Text>

      <Form form={form} layout="vertical">
        <Form.Item
          label={t('setup.steps.workspace.label')}
          field="path"
          initialValue={path}
          rules={[{ required: true, message: t('setup.steps.workspace.error') }]}
        >
          <Input
            placeholder={t('setup.steps.workspace.placeholder')}
            value={path}
            onChange={setPath}
            prefix={<IconFolder />}
          />
        </Form.Item>

        <Form.Item label={t('setup.steps.workspace.suggested')}>
          <Space direction="vertical">
            <Button type="text" onClick={() => { setPath('~/openclaw-workspace'); form.setFieldValue('path', '~/openclaw-workspace'); }}>
              ~/openclaw-workspace {t('setup.steps.workspace.recommended')}
            </Button>
            <Button type="text" onClick={() => { setPath('./workspace'); form.setFieldValue('path', './workspace'); }}>
              ./workspace {t('setup.steps.workspace.current')}
            </Button>
          </Space>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'right', marginTop: 40 }}>
        <Button type="primary" onClick={handleSubmit}>
            {t('setup.steps.checkEnv.next')}
        </Button>
      </div>
    </div>
  );
};

export default SelectWorkspaceStep;
