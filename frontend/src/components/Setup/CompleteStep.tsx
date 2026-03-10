import React from 'react';
import { Result, Button } from '@arco-design/web-react';
import { IconCheck } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';

interface CompleteStepProps {
  onComplete: () => void;
}

const CompleteStep: React.FC<CompleteStepProps> = ({ onComplete }) => {
  const { t } = useTranslation();

  return (
    <div style={{ padding: '40px 0' }}>
      <Result
        status="success"
        title={t('setup.steps.complete.heading')}
        subTitle={t('setup.steps.complete.subheading')}
        extra={
          <Button type="primary" size="large" onClick={onComplete}>
            {t('setup.steps.complete.start')} <IconCheck />
          </Button>
        }
      />
    </div>
  );
};

export default CompleteStep;
