import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  timeout: 30000
});

export const api = {
  environment: {
    check: () => client.get('/environment/check')
  },
  openclaw: {
    install: () => client.post('/openclaw/install'),
    init: (path: string, llmConfig?: any) => client.post('/openclaw/init', { path, llmConfig }),
    start: () => client.post('/openclaw/start'),
    stop: () => client.post('/openclaw/stop'),
    restart: () => client.post('/openclaw/restart'),
    getStatus: () => client.get('/openclaw/status'),
    getSettings: () => client.get('/openclaw/settings'),
    getProjectStatus: (path?: string) => client.get('/openclaw/project-status', { params: { path } }),
    getLogs: (params?: any) => client.get('/openclaw/logs', { params })
  },
  agent: {
    chat: (messages: any[], context?: any, settings?: any) =>
      client.post('/agent/chat', { messages, context, settings }),
    getHistory: (conversationId: string) => client.get(`/agent/history/${conversationId}`)
    // streamChat handled via EventSource directly in store usually
  },
  file: {
    tree: (path: string) => client.get('/file/tree', { params: { path } }),
    read: (path: string) => client.get('/file/read', { params: { path } }),
    write: (path: string, content: string) => client.post('/file/write', { path, content }),
    delete: (path: string) => client.post('/file/delete', { path }),
    rename: (oldPath: string, newPath: string) => client.post('/file/rename', { oldPath, newPath }),
    mkdir: (path: string) => client.post('/file/mkdir', { path })
  }
};
