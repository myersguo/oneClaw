import React, { useEffect, useState } from 'react';
import { Tree, Input, Empty, Dropdown, Menu, Modal, Message, Button, Tooltip } from '@arco-design/web-react';
import { IconFile, IconFolder, IconSearch, IconRefresh } from '@arco-design/web-react/icon';
import { useCodeStore } from '../../stores/code-store';
import { useOpenClawStore } from '../../stores/openclaw-store';
import { api } from '../../api';
import { useTranslation } from 'react-i18next';

const FileTree: React.FC = () => {
  const { fileTree, loadFileTree, openFile, activeFileId, reloadFile } = useCodeStore();
  const workspacePath = useOpenClawStore(state => state.workspacePath);
  const [searchKey, setSearchKey] = useState('');
  const [contextNode, setContextNode] = useState<any>(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'createFile' | 'createFolder' | 'rename'>('createFile');
  const [inputValue, setInputValue] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    if (workspacePath) {
      loadFileTree(workspacePath);
    }
  }, [workspacePath]);

  const handleRefresh = () => {
    if (workspacePath) loadFileTree(workspacePath);
  };

  const handleManualRefresh = async () => {
    if (workspacePath) {
        await loadFileTree(workspacePath);
        if (activeFileId) {
            await reloadFile(activeFileId);
        }
        Message.success(t('code.refreshed'));
    }
  };

  const handleMenuClick = async (key: string, node: any, e?: any) => {
    // Stop propagation to prevent tree node selection
    if (e && e.stopPropagation) {
        e.stopPropagation();
    }
    
    console.log('[FileTree] handleMenuClick triggered:', key, node);
    setContextNode(node);
    
    if (key === 'delete') {
      setDeleteModalVisible(true);
    } else if (key === 'rename') {
      setModalType('rename');
      setInputValue(node.name);
      setModalVisible(true);
    } else if (key === 'newFile') {
      setModalType('createFile');
      setInputValue('');
      setModalVisible(true);
    } else if (key === 'newFolder') {
      setModalType('createFolder');
      setInputValue('');
      setModalVisible(true);
    }
  };

  const handleModalOk = async () => {
    if (!inputValue.trim()) {
      Message.warning(t('code.enterName'));
      return;
    }

    try {
      if (modalType === 'rename') {
        const oldPath = workspacePath ? `${workspacePath}/${contextNode.path}` : contextNode.path;
        const basePath = oldPath.substring(0, oldPath.lastIndexOf('/'));
        const newPath = `${basePath}/${inputValue}`;
        
        await api.file.rename(oldPath, newPath);
        Message.success(t('code.opSuccess'));
      } else if (modalType === 'createFile' || modalType === 'createFolder') {
        const parentPath = workspacePath ? `${workspacePath}/${contextNode.path}` : contextNode.path;
        const newPath = `${parentPath}/${inputValue}`;

        if (modalType === 'createFile') {
          await api.file.write(newPath, ''); // Create empty file
        } else {
          await api.file.mkdir(newPath);
        }
        Message.success(t('code.opSuccess'));
      }
      
      setModalVisible(false);
      handleRefresh();
    } catch (e: any) {
      Message.error(t('code.opFailed', { error: e.message }));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!contextNode) return;
    const fullPath = workspacePath ? `${workspacePath}/${contextNode.path}` : contextNode.path;
    
    console.log('[FileTree] Confirm delete:', fullPath);
    try {
        await api.file.delete(fullPath);
        Message.success(t('code.deleteSuccess'));
        handleRefresh();
        setDeleteModalVisible(false);
    } catch (e: any) {
        console.error('[FileTree] Delete error:', e);
        Message.error(t('code.deleteFailed', { error: e.message }));
    }
  };

  const renderTreeNode = (node: any) => {
    const isLeaf = !node.isDirectory;
    
    // Construct menu based on node type
    const droplist = (
      <Menu onClickMenuItem={(key) => handleMenuClick(key, node)}>
        {!isLeaf && <Menu.Item key="newFile">{t('code.newFile')}</Menu.Item>}
        {!isLeaf && <Menu.Item key="newFolder">{t('code.newFolder')}</Menu.Item>}
        <Menu.Item key="rename">{t('code.rename')}</Menu.Item>
        <Menu.Item key="delete">{t('code.delete')}</Menu.Item>
      </Menu>
    );

    return {
      title: (
        <Dropdown droplist={droplist} trigger="contextMenu" position="bl">
          <span style={{ cursor: 'pointer', display: 'inline-block' }}>{node.name}</span>
        </Dropdown>
      ),
      key: node.path,
      icon: node.isDirectory ? <IconFolder /> : <IconFile />,
      children: node.children?.map(renderTreeNode),
      isLeaf: isLeaf,
      dataRef: node
    };
  };

  return (
    <div style={{ height: '100%', background: '#f7f8fa', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 12px 0 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div
            title={workspacePath || ''}
            style={{
                fontSize: 12,
                color: '#86909c',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                marginRight: 8
            }}
            >
            {workspacePath || 'No Workspace'}
            </div>
            <Tooltip content={t('code.refresh')}>
                <Button 
                    icon={<IconRefresh />} 
                    size="mini" 
                    type="text"
                    onClick={handleManualRefresh}
                />
            </Tooltip>
        </div>
        <Input
          prefix={<IconSearch />}
          placeholder={t('code.search')}
          value={searchKey}
          onChange={setSearchKey}
          style={{ marginBottom: 12 }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px 12px' }}>
        {fileTree.length > 0 ? (
          <Tree
            treeData={fileTree.map(renderTreeNode)}
            defaultExpandedKeys={[]}
            autoExpandParent={false}
            onSelect={(keys, extra) => {
                const node = extra.node.props.dataRef;
                if (node && !node.isDirectory) {
                    const path = keys[0];
                    const fullPath = workspacePath ? `${workspacePath}/${path}` : path;
                    openFile(fullPath);
                }
            }}
            showLine
          />
        ) : (
          <Empty description={workspacePath ? t('code.noFilesFound') : t('code.noWorkspaceSelected')} />
        )}
      </div>

      <Modal
        title={
          modalType === 'rename' ? t('code.rename') : 
          modalType === 'createFile' ? t('code.newFile') : t('code.newFolder')
        }
        visible={modalVisible}
        onOk={handleModalOk}
        onCancel={() => setModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <Input 
          value={inputValue} 
          onChange={setInputValue} 
          placeholder={t('code.enterName')}
          onPressEnter={handleModalOk}
        />
      </Modal>

      <Modal
        title={t('code.confirmDelete')}
        visible={deleteModalVisible}
        onOk={handleDeleteConfirm}
        onCancel={() => setDeleteModalVisible(false)}
        autoFocus={false}
        focusLock={true}
      >
        <p>{t('code.deleteWarning', { name: contextNode?.name })}</p>
      </Modal>
    </div>
  );
};

export default FileTree;
