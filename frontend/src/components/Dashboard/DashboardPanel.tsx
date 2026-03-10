import React, { useEffect, useState } from 'react';
import { Button, Space, Typography, Spin, Empty, Result } from '@arco-design/web-react';
import { IconPlayArrow, IconRefresh } from '@arco-design/web-react/icon';
import { useOpenClawStore } from '../../stores/openclaw-store';
import { useTranslation } from 'react-i18next';

const DashboardPanel: React.FC = () => {
  const { status, loadStatus, start, restart } = useOpenClawStore();
  const [iframeLoading, setIframeLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
    loadStatus();
    const interval = setInterval(() => {
      loadStatus();
    }, 5000); // Auto refresh status
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status.webUrl) {
      setIframeLoading(true);
    }
  }, [status.webUrl]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
  };

  const handleRefresh = () => {
    setIframeLoading(true);
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部控制栏 */}
      <div style={{
        padding: '12px 20px',
        borderBottom: '1px solid #e5e6eb',
        background: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Space>
          <Typography.Text bold>{t('dashboard.gatewayStatus')}:</Typography.Text>
          <Typography.Text type={status.running ? 'success' : 'secondary'}>
            {status.running ? t('layout.running') : t('layout.stopped')}
          </Typography.Text>
          {status.running && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Port: {status.port}
            </Typography.Text>
          )}
        </Space>

        <Space>
          {!status.running && (
            <Button type="primary" status="success" icon={<IconPlayArrow />} onClick={start}>
              {t('dashboard.startGateway')}
            </Button>
          )}
          {status.running && status.webUrl && (
            <Button icon={<IconRefresh />} onClick={handleRefresh} loading={iframeLoading}>
              {t('dashboard.refreshDashboard')}
            </Button>
          )}
          {status.running && (
            <Button icon={<IconRefresh />} onClick={restart}>
              {t('dashboard.restartGateway')}
            </Button>
          )}
        </Space>
      </div>

      {/* 主内容区域：Iframe 或 状态提示 */}
      <div style={{ flex: 1, position: 'relative', background: '#f0f2f5' }}>
        {status.running && status.webUrl ? (
          <>
            {iframeLoading && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.8)',
                zIndex: 10
              }}>
                <Spin tip={t('dashboard.loading')} />
              </div>
            )}
            <iframe
              key={`${status.webUrl}-${refreshKey}`} // Force reload when URL changes or manual refresh
              src={status.webUrl}
              style={{ width: '100%', height: '100%', border: 'none' }}
              onLoad={handleIframeLoad}
              sandbox="allow-scripts allow-forms allow-same-origin allow-top-navigation-by-user-activation allow-popups allow-downloads allow-storage-access-by-user-activation allow-pointer-lock"
              allow="clipboard-read *; clipboard-write *; downloads *; microphone *; camera *; geolocation *; fullscreen *;"
              title="OpenClaw Dashboard"
            />
          </>
        ) : status.running && !status.webUrl ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <Result
                status="warning"
                title={t('layout.running')}
                subTitle={t('dashboard.waitingUrl')}
                extra={
                    <Button onClick={() => window.open(`http://localhost:${status.port || 18789}`, '_blank')}>
                        {t('dashboard.tryDirectLink')} (http://localhost:{status.port || 18789})
                    </Button>
                }
             />
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty
              description={
                <Space direction="vertical" align="center">
                  <span>{t('dashboard.gatewayStopped')}</span>
                  <Button type="primary" onClick={start}>{t('dashboard.startToView')}</Button>
                </Space>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPanel;
