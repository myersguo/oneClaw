import React from 'react';
import { Layout, Space } from '@arco-design/web-react';
import { IconDashboard, IconCode } from '@arco-design/web-react/icon';
import { useAppStore } from '../../stores/app-store';
import Header from './Header';
import ChatPanel from '../Chat/ChatPanel';
import DashboardPanel from '../Dashboard/DashboardPanel';
import CodePanel from '../Code/CodePanel';
import { useTranslation } from 'react-i18next';

const MainLayout: React.FC = () => {
  const { activeWorkspaceTab, setActiveWorkspaceTab } = useAppStore();
  const { t } = useTranslation();

  const tabStyle = (isActive: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    height: '100%',
    padding: '0 16px',
    cursor: 'pointer',
    color: isActive ? 'rgb(22, 93, 255)' : 'rgb(78, 89, 105)',
    borderBottom: isActive ? '2px solid rgb(22, 93, 255)' : '2px solid transparent',
    transition: 'all 0.2s',
    fontWeight: isActive ? 500 : 400,
    fontSize: 14,
  });

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Layout.Header style={{ height: 60 }}>
        <Header />
      </Layout.Header>

      <Layout style={{ height: 'calc(100vh - 60px)' }}>
        {/* 左侧：Chat 对话区域 */}
        <Layout.Sider
          width={400}
          style={{
            backgroundColor: '#fff',
            borderRight: '1px solid #e5e6eb'
          }}
        >
          <ChatPanel />
        </Layout.Sider>

        {/* 右侧：工作区 */}
        <Layout.Content style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 顶部 Tab 切换 - 自定义实现替代 Tabs 以兼容 React 19 */}
          <div style={{
            height: 40,
            borderBottom: '1px solid #e5e6eb',
            backgroundColor: '#fff',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <div 
              style={tabStyle(activeWorkspaceTab === 'dashboard')}
              onClick={() => setActiveWorkspaceTab('dashboard')}
            >
              <Space>
                <IconDashboard />
                {t('layout.dashboard')}
              </Space>
            </div>
            
            <div 
              style={tabStyle(activeWorkspaceTab === 'code')}
              onClick={() => setActiveWorkspaceTab('code')}
            >
              <Space>
                <IconCode />
                {t('layout.code')}
              </Space>
            </div>
          </div>

          {/* 内容区域 */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {activeWorkspaceTab === 'dashboard' && <DashboardPanel />}
            {activeWorkspaceTab === 'code' && <CodePanel />}
          </div>
        </Layout.Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
