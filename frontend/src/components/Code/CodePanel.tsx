import React from 'react';
import { ResizeBox } from '@arco-design/web-react';
import FileTree from './FileTree';
import EditorPanel from './EditorPanel';

const CodePanel: React.FC = () => {
  return (
    <ResizeBox.Split
      direction="horizontal"
      style={{ height: '100%', width: '100%' }}
      size={0.25}
      panes={[
        <div style={{ height: '100%', overflow: 'hidden' }}>
            <FileTree />
        </div>,
        <div style={{ height: '100%', overflow: 'hidden' }}>
            <EditorPanel />
        </div>
      ]}
      min={0.15}
      max={0.4}
    />
  );
};

export default CodePanel;
