import React, { useEffect, useState } from 'react';
import { Result, Spin, Button, Typography } from '@arco-design/web-react';
import { useOpenClawStore } from '../../stores/openclaw-store';
import { useAppStore } from '../../stores/app-store';
import { api } from '../../api';
import { useTranslation } from 'react-i18next';

interface InitProjectStepProps {
  onNext: () => void;
}

const InitProjectStep: React.FC<InitProjectStepProps> = ({ onNext }) => {
  const [status, setStatus] = useState<'process' | 'success' | 'error'>('process');
  const workspacePath = useOpenClawStore(state => state.workspacePath);
  const llmConfig = useAppStore(state => state.llmConfig);
  const { t } = useTranslation();

  useEffect(() => {
    const init = async () => {
      if (!workspacePath) return;
      try {
        await api.openclaw.init(workspacePath, llmConfig);
        // Auto start after initialization
        try {
            await api.openclaw.start();
        } catch (startError) {
            console.error('Auto start failed', startError);
        }
        setStatus('success');
      } catch (error) {
        console.error('Init failed', error);
        setStatus('error');
      }
    };
    init();
  }, [workspacePath, llmConfig]);

  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      {status === 'process' && (
        <>
          <Spin size={40} />
          <Typography.Title heading={5} style={{ marginTop: 20 }}>
            {t('setup.steps.init.processing')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('setup.steps.init.processDesc')}
          </Typography.Text>
        </>
      )}

      {status === 'success' && (
        <Result
          status="success"
          title={t('setup.steps.init.success')}
          subTitle={t('setup.steps.init.successDesc', { path: workspacePath })}
          extra={
            <Button type="primary" onClick={onNext}>
              {t('setup.steps.checkEnv.next')}
            </Button>
          }
        />
      )}

      {status === 'error' && (
        <Result
          status="error"
          title={t('setup.steps.init.error')}
          subTitle={t('setup.steps.init.errorDesc')}
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              {t('setup.steps.init.retry')}
            </Button>
          }
        />
      )}
    </div>
  );
};

export default InitProjectStep;
