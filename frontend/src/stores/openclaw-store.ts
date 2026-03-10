import { create } from 'zustand';
import { api } from '../api';

interface OpenClawStatus {
  running: boolean;
  version?: string;
  port?: number;
  uptime?: number;
  webUrl?: string;
}

interface OpenClawStore {
  status: OpenClawStatus;
  devices: any[];
  logs: any[];
  workspacePath: string | null;
  loadStatus: () => Promise<void>;
  checkProjectStatus: () => Promise<boolean>;
  loadLogs: () => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  restart: () => Promise<void>;
  setWorkspacePath: (path: string) => void;
}

export const useOpenClawStore = create<OpenClawStore>((set, get) => ({
  status: { running: false },
  devices: [],
  logs: [],
  workspacePath: localStorage.getItem('workspacePath') || null,

  loadStatus: async () => {
    try {
      const response = await api.openclaw.getStatus();
      set({ status: response.data });
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  },

  checkProjectStatus: async () => {
    try {
        const path = get().workspacePath;
        const response = await api.openclaw.getProjectStatus(path || undefined);
        return response.data.initialized;
    } catch (error) {
        console.error('Failed to check project status:', error);
        return false;
    }
  },

  loadLogs: async () => {
    try {
        // TODO: Implement logs API
    } catch (error) {
        console.error('Failed to load logs:', error);
    }
  },

  start: async () => {
    try {
      const response = await api.openclaw.start();
      const result = response.data;
      if (result.success && result.webUrl) {
          set((state) => ({ 
              status: { ...state.status, webUrl: result.webUrl } 
          }));
      }
      await get().loadStatus();
    } catch (error) {
      console.error('Failed to start OpenClaw:', error);
    }
  },

  stop: async () => {
    try {
      await api.openclaw.stop();
      await get().loadStatus();
    } catch (error) {
      console.error('Failed to stop OpenClaw:', error);
    }
  },

  restart: async () => {
    try {
      await api.openclaw.restart();
      await get().loadStatus();
    } catch (error) {
      console.error('Failed to restart OpenClaw:', error);
    }
  },

  setWorkspacePath: (path: string) => {
    localStorage.setItem('workspacePath', path);
    set({ workspacePath: path });
  }
}));
