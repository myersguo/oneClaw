import React, { useState } from 'react';
import { Typography, Tooltip, Message } from '@arco-design/web-react';
import { IconCommand, IconCaretRight, IconCaretDown, IconCopy } from '@arco-design/web-react/icon';
import { useTranslation } from 'react-i18next';

interface ToolCall {
  name?: string;
  params?: any; // function.arguments
  result?: any;
  status?: 'success' | 'error' | 'running';
  error?: string;
  function?: {
    name: string;
    arguments: string;
  };
  id?: string;
  type?: string;
}

const ToolCallItem: React.FC<{ call: ToolCall }> = ({ call }) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  // ... (keep params logic)
  let params: any = {};
  try {
    params = typeof call.function?.arguments === 'string'
      ? JSON.parse(call.function.arguments)
      : call.function?.arguments || {};
  } catch (e) {
    params = { raw: call.function?.arguments };
  }

  const toolName = call.function?.name || call.name || 'Unknown Tool';
  
  let fullCommand = '';
  if (toolName === 'exec_shell') fullCommand = params.command;
  else if (toolName === 'read_file') fullCommand = `read ${params.path || params.file_path}`;
  else if (toolName === 'write_file') fullCommand = `write ${params.path || params.file_path}`;
  else if (toolName === 'edit_file') fullCommand = `edit ${params.path || params.file_path}`;
  else if (toolName === 'glob_file') fullCommand = `glob ${params.pattern}`;
  else if (toolName === 'grep_file') fullCommand = `grep ${params.pattern}`;
  else fullCommand = Object.keys(params).length > 0 ? JSON.stringify(params) : '';

  let commandSnippet = fullCommand;
  if (commandSnippet?.length > 100) {
      commandSnippet = commandSnippet.substring(0, 100) + '...';
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fullCommand) {
        navigator.clipboard.writeText(fullCommand)
            .then(() => Message.success(t('code.opSuccess')))
            .catch(() => Message.error(t('code.opFailed', { error: 'Failed to copy' })));
    }
  };

  const hasResult = call.result || call.error;

  return (
    <div style={{ marginBottom: 12 }}>
      {/* 头部：执行命令 */}
      <div 
        style={{ 
          // ... (keep style)
          display: 'flex', 
          alignItems: 'flex-start',
          color: '#4e5969',
          cursor: hasResult ? 'pointer' : 'default',
          userSelect: 'none',
          position: 'relative'
        }}
        onClick={() => hasResult && setExpanded(!expanded)}
        className="tool-call-header"
      >
        <div style={{ marginRight: 8, marginTop: 2, display: 'flex', alignItems: 'center' }}>
            <IconCommand />
            {hasResult && (
              <div style={{ marginLeft: 4, fontSize: 12, color: '#86909c' }}>
                {expanded ? <IconCaretDown /> : <IconCaretRight />}
              </div>
            )}
        </div>
        <div style={{ flex: 1, marginRight: 24 }}>
          <Typography.Text style={{ marginRight: 8, fontWeight: 500 }}>
            {t('code.toolExec')} {toolName}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontFamily: 'monospace' }}>
            {commandSnippet}
          </Typography.Text>
        </div>
        
        {/* Copy Button */}
        {fullCommand && (
            <div 
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    opacity: 0.6,
                    cursor: 'pointer'
                }}
                onClick={handleCopy}
            >
                <Tooltip content="Copy Command">
                    <IconCopy />
                </Tooltip>
            </div>
        )}
      </div>

      {/* ... (keep result display) */}
      {expanded && hasResult && (
        <div style={{ 
          marginLeft: 24, // 缩进对齐图标右侧
          marginTop: 8,
          background: '#f7f8fa',
          borderRadius: 4,
          padding: '8px 12px',
          border: '1px solid #e5e6eb'
        }}>
          {call.error ? (
            <Typography.Text type="error">Error: {call.error}</Typography.Text>
          ) : (
            <pre style={{
              margin: 0,
              fontFamily: 'Menlo, Monaco, Consolas, "Courier New", monospace',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: call.result?.status === 'error' ? '#f53f3f' : '#333',
              maxHeight: 400,
              overflowY: 'auto'
            }}>
              {typeof call.result === 'string' 
                ? call.result 
                : JSON.stringify(call.result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};

const ToolCallsDisplay: React.FC<{ toolCalls: ToolCall[] }> = ({ toolCalls }) => {
  return (
    <div style={{ marginTop: 12 }}>
      {toolCalls.map((call, index) => (
        <ToolCallItem key={index} call={call} />
      ))}
    </div>
  );
};

export default ToolCallsDisplay;
