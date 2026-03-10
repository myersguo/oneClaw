import { useEffect } from 'react';
import { ConfigProvider } from '@arco-design/web-react';
import MainLayout from './components/Layout/MainLayout';
import SetupWizard from './components/Setup/SetupWizard';
import { useOpenClawStore } from './stores/openclaw-store';
import { useSettingsStore } from './stores/settings-store';
import { useAppStore } from './stores/app-store';
import '@arco-design/web-react/dist/css/arco.css';
import './index.css';

import enUS from '@arco-design/web-react/es/locale/en-US';
import zhCN from '@arco-design/web-react/es/locale/zh-CN';
import { useTranslation } from 'react-i18next';

function App() {
  const { workspacePath, checkProjectStatus } = useOpenClawStore();
  const { loadSettings, settings } = useSettingsStore();
  const { darkMode, initialized, setInitialized } = useAppStore();
  const { i18n } = useTranslation();

  useEffect(() => {
    // Load settings from local storage
    loadSettings();

    // Optional: Auto-sync initialization state if backend confirms project is ready
    // But we trust localStorage as the primary source of truth for setup wizard completion
    const checkInit = async () => {
        const isInit = await checkProjectStatus();
        // Only update if backend confirms initialization AND we haven't marked it locally
        if (isInit && !initialized) {
            setInitialized(true);
        }
        // Don't reset if backend says false - user may have completed wizard but backend check fails
    };

    if (workspacePath) {
        checkInit();
    }
  }, []);

  useEffect(() => {
    // Update i18n language when settings change
    if (settings.language && settings.language !== i18n.language) {
      i18n.changeLanguage(settings.language);
    }
  }, [settings.language, i18n]);

  const getArcoLocale = () => {
    switch (settings.language) {
      case 'zh':
        return zhCN;
      default:
        return enUS;
    }
  };

  const handleSetupComplete = () => {
    setInitialized(true);
  };

  return (
    <ConfigProvider locale={getArcoLocale()}>
      <div className={darkMode ? 'arco-theme-dark' : ''} style={{ height: '100vh', width: '100vw' }}>
        {initialized ? (
          <MainLayout />
        ) : (
          <SetupWizard onComplete={handleSetupComplete} />
        )}
      </div>
    </ConfigProvider>
  );
}

export default App;
