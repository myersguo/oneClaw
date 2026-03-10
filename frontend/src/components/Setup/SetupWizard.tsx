import React, { useState } from 'react';
import { Steps, Card, Typography } from '@arco-design/web-react';
import CheckEnvStep from './CheckEnvStep';
import SelectWorkspaceStep from './SelectWorkspaceStep';
import InitProjectStep from './InitProjectStep';
import LLMConfigStep from './LLMConfigStep';
import CompleteStep from './CompleteStep';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../stores/app-store';
import { useOpenClawStore } from '../../stores/openclaw-store';
import { useSettingsStore } from '../../stores/settings-store';

const SetupWizard: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const { t } = useTranslation();

  const handleComplete = async () => {
    // Sync to settings store to ensure consistency across the app
    const llmConfig = useAppStore.getState().llmConfig;
    const workspacePath = useOpenClawStore.getState().workspacePath;
    const { updateSettings } = useSettingsStore.getState();
    
    // Only update if we have values
    if (workspacePath || llmConfig) {
        await updateSettings({
            workspacePath: workspacePath || '',
            openaiApiKey: llmConfig?.apiKey || '',
            openaiModel: llmConfig?.modelName || '',
            openaiBaseUrl: llmConfig?.baseUrl || ''
        });
    }

    onComplete();
  };

  const steps = [
    { title: t('setup.steps.checkEnv.title'), description: t('setup.steps.checkEnv.desc') },
    { title: t('setup.steps.workspace.title'), description: t('setup.steps.workspace.desc') },
    { title: t('setup.steps.llm.title'), description: t('setup.steps.llm.desc') },
    { title: t('setup.steps.init.title'), description: t('setup.steps.init.desc') },
    { title: t('setup.steps.complete.title'), description: t('setup.steps.complete.desc') }
  ];

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 800, maxWidth: '90vw' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 10 }}>🦞</div>
          <Typography.Title heading={3}>{t('setup.title')}</Typography.Title>
          <Typography.Text type="secondary">
            {t('setup.subtitle')}
          </Typography.Text>
        </div>

        <Steps current={currentStep} style={{ marginBottom: 40 }}>
          {steps.map((step, index) => (
            <Steps.Step
              key={index}
              title={step.title}
              description={step.description}
            />
          ))}
        </Steps>

        <div style={{ minHeight: 300 }}>
          {currentStep === 0 && <CheckEnvStep onNext={() => setCurrentStep(1)} />}
          {currentStep === 1 && <SelectWorkspaceStep onNext={() => setCurrentStep(2)} />}
          {currentStep === 2 && <LLMConfigStep onNext={() => setCurrentStep(3)} />}
          {currentStep === 3 && <InitProjectStep onNext={() => setCurrentStep(4)} />}
          {currentStep === 4 && <CompleteStep onComplete={handleComplete} />}
        </div>
      </Card>
    </div>
  );
};

export default SetupWizard;
