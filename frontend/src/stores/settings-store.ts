import { create } from 'zustand';

interface Settings {
  openaiApiKey: string;
  openaiModel: string;
  openaiBaseUrl: string;
  llmProvider: string; // Add provider field
  workspacePath: string;
  autoStartGateway: boolean;
  language: string;
}

interface SettingsStore {
  settings: Settings;
  loadSettings: () => void;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  setLanguage: (lang: string) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: {
    openaiApiKey: localStorage.getItem('openaiApiKey') || '',
    openaiModel: localStorage.getItem('openaiModel') || 'gpt-4-turbo',
    openaiBaseUrl: localStorage.getItem('openaiBaseUrl') || 'https://api.openai.com/v1',
    llmProvider: localStorage.getItem('llmProvider') || 'openai', // Default to openai
    workspacePath: localStorage.getItem('workspacePath') || '',
    autoStartGateway: localStorage.getItem('autoStartGateway') === 'true',
    language: localStorage.getItem('openclaw_language') || 'en'
  },

  loadSettings: () => {
    const settings: Settings = {
      openaiApiKey: localStorage.getItem('openaiApiKey') || '',
      openaiModel: localStorage.getItem('openaiModel') || 'gpt-4-turbo',
      openaiBaseUrl: localStorage.getItem('openaiBaseUrl') || 'https://api.openai.com/v1',
      llmProvider: localStorage.getItem('llmProvider') || 'openai',
      workspacePath: localStorage.getItem('workspacePath') || '',
      autoStartGateway: localStorage.getItem('autoStartGateway') === 'true',
      language: localStorage.getItem('openclaw_language') || 'en'
    };
    set({ settings });
  },

  updateSettings: async (newSettings: Partial<Settings>) => {
    const updated = { ...get().settings, ...newSettings };

    Object.entries(updated).forEach(([key, value]) => {
      // Handle language separately as we use a specific key for i18n init
      if (key !== 'language') {
        localStorage.setItem(key, String(value));
      }
    });

    set({ settings: updated });
  },

  setLanguage: (lang: string) => {
    localStorage.setItem('openclaw_language', lang);
    set(state => ({
      settings: { ...state.settings, language: lang }
    }));
  }
}));
