import React from 'react';
import { Space, Typography, Button, Switch, Tag, Drawer } from '@arco-design/web-react';
import { IconSunFill, IconMoonFill, IconSettings, IconFolder } from '@arco-design/web-react/icon';
import { useOpenClawStore } from '../../stores/openclaw-store';
import { useAppStore } from '../../stores/app-store';
import SettingsPanel from './SettingsPanel';
import { useTranslation } from 'react-i18next';

const Header: React.FC = () => {
  const { workspacePath, status } = useOpenClawStore();
  const { settingsVisible, openSettings, closeSettings, darkMode, toggleDarkMode } = useAppStore();
  const { t } = useTranslation();

  return (
    <>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 20px',
        height: '100%',
        borderBottom: '1px solid #e5e6eb',
        background: '#fff'
      }}>
        {/* 左侧：Logo + 工作区路径 */}
        <Space size="large">
          <Space>
            <span style={{ fontSize: 24 }}>🦞</span>
            <Typography.Title heading={5} style={{ margin: 0 }}>
              {t('common.title')}
            </Typography.Title>
          </Space>

          {workspacePath && (
            <Tag color="arcoblue" icon={<IconFolder />}>
              {workspacePath}
            </Tag>
          )}
        </Space>

        {/* 右侧：状态 + 操作 */}
        <Space>
          {/* OpenClaw 状态 */}
          <Tag color={status.running ? 'green' : 'gray'}>
            {status.running ? `● ${t('layout.running')}` : `○ ${t('layout.stopped')}`}
          </Tag>

          {/* 主题切换 */}
          <Switch
            checked={darkMode}
            onChange={toggleDarkMode}
            checkedIcon={<IconMoonFill />}
            uncheckedIcon={<IconSunFill />}
          />

          {/* 设置按钮 */}
          <Button
            type="text"
            icon={<IconSettings />}
            onClick={openSettings}
          >
            {t('common.settings')}
          </Button>
        </Space>
      </div>

      {/* 设置抽屉 */}
      <Drawer
        width={500}
        title={t('common.settings')}
        visible={settingsVisible}
        onCancel={closeSettings}
        footer={null}
      >
        <SettingsPanel onClose={closeSettings} />
      </Drawer>
    </>
  );
};

export default Header;
