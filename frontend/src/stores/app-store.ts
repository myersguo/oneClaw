import { create } from 'zustand';

interface AppStore {
  activeWorkspaceTab: 'dashboard' | 'code';
  setActiveWorkspaceTab: (tab: 'dashboard' | 'code') => void;
  settingsVisible: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  initialized: boolean;
  setInitialized: (value: boolean) => void;
  resetInitialization: () => void;
  llmConfig: any;
  setLLMConfig: (config: any) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activeWorkspaceTab: 'dashboard',
  setActiveWorkspaceTab: (tab) => set({ activeWorkspaceTab: tab }),
  settingsVisible: false,
  openSettings: () => set({ settingsVisible: true }),
  closeSettings: () => set({ settingsVisible: false }),
  darkMode: false,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  initialized: localStorage.getItem('appInitialized') === 'true',
  setInitialized: (value: boolean) => {
    localStorage.setItem('appInitialized', String(value));
    set({ initialized: value });
  },
  resetInitialization: () => {
    localStorage.removeItem('appInitialized');
    set({ initialized: false });
  },
  llmConfig: null,
  setLLMConfig: (config) => set({ llmConfig: config })
}));
