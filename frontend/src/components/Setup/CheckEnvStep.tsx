import React, { useEffect, useState } from 'react';
import { Result, Spin, Descriptions, Tag, Space, Typography, Button } from '@arco-design/web-react';
import { IconCheckCircle, IconCloseCircle } from '@arco-design/web-react/icon';
import { api } from '../../api';
import { useTranslation } from 'react-i18next';

interface CheckEnvStepProps {
  onNext: () => void;
}

const CheckEnvStep: React.FC<CheckEnvStepProps> = ({ onNext }) => {
  const [checking, setChecking] = useState(true);
  const [envStatus, setEnvStatus] = useState<{
    nodeVersion?: string;
    openClawInstalled: boolean;
    openClawVersion?: string;
  }>({
    openClawInstalled: false
  });
  const { t } = useTranslation();

  const checkEnvironment = async () => {
    setChecking(true);
    try {
      const response = await api.environment.check();
      setEnvStatus(response.data);
    } catch (error) {
      console.error('Failed to check environment', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkEnvironment();
  }, []);

  const handleInstall = async () => {
    setChecking(true);
    try {
        await api.openclaw.install();
        await checkEnvironment();
    } catch (error) {
        console.error('Installation failed', error);
        setChecking(false);
    }
  };

  if (checking) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size={40} />
        <div style={{ marginTop: 20 }}>{t('setup.steps.checkEnv.checking')}</div>
      </div>
    );
  }

  // Simple check: node version and openclaw installed
  const nodeOk = envStatus.nodeVersion && parseInt(envStatus.nodeVersion.replace('v', '').split('.')[0]) >= 18;
  const allOk = envStatus.openClawInstalled && nodeOk;

  return (
    <div>
      <Result
        status={allOk ? 'success' : 'warning'}
        title={allOk ? t('setup.steps.checkEnv.passed') : t('setup.steps.checkEnv.needInstall')}
        subTitle={allOk ? t('setup.steps.checkEnv.ready') : t('setup.steps.checkEnv.needInstallDesc')}
      />

      <Descriptions
        column={1}
        data={[
          {
            label: t('setup.steps.checkEnv.nodeVersion'),
            value: envStatus.nodeVersion ? (
              <Space>
                <Tag color="green" icon={<IconCheckCircle />}>
                  {envStatus.nodeVersion}
                </Tag>
                {nodeOk ? (
                  <Typography.Text type="success">✓ {t('setup.steps.checkEnv.nodeOk')}</Typography.Text>
                ) : (
                  <Typography.Text type="error">✗ {t('setup.steps.checkEnv.nodeFail')}</Typography.Text>
                )}
              </Space>
            ) : (
              <Tag color="red" icon={<IconCloseCircle />}>{t('setup.steps.checkEnv.notDetected')}</Tag>
            )
          },
          {
            label: t('setup.steps.checkEnv.openclaw'),
            value: envStatus.openClawInstalled ? (
              <Space>
                <Tag color="green" icon={<IconCheckCircle />}>
                  {t('setup.steps.checkEnv.installed')}
                </Tag>
                <Typography.Text type="secondary">
                  {t('setup.steps.checkEnv.version')}: {envStatus.openClawVersion}
                </Typography.Text>
              </Space>
            ) : (
              <Space direction="vertical">
                <Tag color="orange" icon={<IconCloseCircle />}>{t('setup.steps.checkEnv.notInstalled')}</Tag>
                <Button type="primary" size="small" onClick={handleInstall}>
                  {t('setup.steps.checkEnv.installBtn')}
                </Button>
              </Space>
            )
          }
        ]}
        style={{ marginTop: 20, padding: '0 40px' }}
      />
      
      <div style={{ textAlign: 'right', marginTop: 40 }}>
        <Button type="primary" disabled={!allOk} onClick={onNext}>
            {t('setup.steps.checkEnv.next')}
        </Button>
      </div>
    </div>
  );
};

export default CheckEnvStep;
