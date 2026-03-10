import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { useCodeStore } from '../../stores/code-store';

interface MonacoEditorProps {
  file: any;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({ file }) => {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { updateFileContent, saveFile } = useCodeStore();
  const isProgrammaticChange = useRef(false);
  const fileContentRef = useRef(file.content);

  // Update ref when props change to avoid closure issues in callbacks
  useEffect(() => {
    fileContentRef.current = file.content;
  }, [file.content]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Dispose previous instance if any
    if (editorRef.current) {
      editorRef.current.dispose();
    }

    const editor = monaco.editor.create(containerRef.current, {
      value: file.content,
      language: getLanguage(file.path),
      theme: 'vs-dark',
      readOnly: false,
      minimap: { enabled: true },
      fontSize: 14,
      lineNumbers: 'on',
      automaticLayout: false, // We will handle layout manually with ResizeObserver
      scrollBeyondLastLine: false,
    });

    editor.onDidChangeModelContent(() => {
        if (isProgrammaticChange.current) return;
        
        const value = editor.getValue();
        // Use ref to compare with latest content, avoiding closure staleness
        if (value !== fileContentRef.current) {
            updateFileContent(file.id, value);
        }
    });

    // Add Save command (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        saveFile(file.id);
    });

    editorRef.current = editor;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
        editor.layout();
    });
    resizeObserver.observe(containerRef.current);

    // Initial layout
    editor.layout();

    return () => {
      resizeObserver.disconnect();
      editor.dispose();
    };
  }, [file.id]); // Re-create only if file ID changes

  // Update content if changed externally
  useEffect(() => {
    if (editorRef.current && file.content !== undefined) {
      const model = editorRef.current.getModel();
      // If content mismatch and not focused (or force update strategy), update editor
      // But usually we trust store as source of truth.
      // If user is typing, store updates -> this effect triggers.
      // We must check if editor value is already same to avoid cursor jumping.
      if (model && model.getValue() !== file.content) {
        // This is an external change (e.g. from API load or other user)
        // Mark as programmatic to skip onDidChangeModelContent logic
        isProgrammaticChange.current = true;
        
        // Use pushEditOperations to preserve undo stack? Or setValue?
        // setValue clears undo stack. For full content replacement (like loading), setValue is fine.
        // For collaborative editing, we'd need more complex logic.
        // Here we just use setValue but wrapped in executeEdits to try to be nicer? 
        // No, setValue is standard for full replace.
        
        // Save cursor position
        const position = editorRef.current.getPosition();
        
        editorRef.current.setValue(file.content);
        
        // Restore cursor position if possible (might be out of bounds if content shrank)
        if (position) {
            editorRef.current.setPosition(position);
        }
        
        isProgrammaticChange.current = false;
      }
    }
  }, [file.content]);

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', width: '100%' }}
    />
  );
};

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'md': 'markdown',
    'sh': 'shell',
    'py': 'python',
    'go': 'go',
    'rs': 'rust',
    'yaml': 'yaml',
    'yml': 'yaml',
    'css': 'css',
    'html': 'html'
  };
  return languageMap[ext || ''] || 'plaintext';
}

export default MonacoEditor;
