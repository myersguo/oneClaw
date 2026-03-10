import { create } from 'zustand';
import { useSettingsStore } from './settings-store';
import { useOpenClawStore } from './openclaw-store';
import i18n from '../i18n';

export interface Step {
  id: string;
  type: 'text' | 'tool';
  content?: string; // for text
  toolCalls?: any[]; // for tool
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string; // 保持兼容：所有文本内容的拼接
  toolCalls?: any[]; // 保持兼容：所有 tool calls 的集合
  steps?: Step[]; // 新增：按顺序排列的步骤
  timestamp: number;
}

export interface Conversation {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
}

interface ChatStore {
  messages: Message[];
  loading: boolean;
  streaming: boolean;
  currentStreamContent: string;
  sendMessage: (content: string) => Promise<void>;
  addUserMessage: (content: string) => void;
  finishStream: (toolCalls?: any[]) => void;
  clearMessages: () => void;
  restoreHistory: () => Promise<void>;
  conversationId: string | null;
  
  // New features
  historyList: Conversation[];
  fetchHistoryList: () => Promise<void>;
  startNewChat: () => void;
  loadConversation: (id: string) => Promise<void>;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  loading: false,
  streaming: false,
  currentStreamContent: '',
  conversationId: localStorage.getItem('openclaw_conversation_id'),
  
  historyList: [],

  fetchHistoryList: async () => {
    try {
        const res = await fetch('/api/agent/history');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
                set({ historyList: data });
            }
        }
    } catch (e) {
        console.error('Failed to fetch history list:', e);
    }
  },

  startNewChat: () => {
    set({ messages: [], conversationId: null, loading: false, streaming: false });
    localStorage.removeItem('openclaw_conversation_id');
  },

  loadConversation: async (id: string) => {
    try {
        const res = await fetch(`/api/agent/history/${id}`);
        if (!res.ok) {
            if (res.status === 404) {
                // Conversation not found
                if (localStorage.getItem('openclaw_conversation_id') === id) {
                    localStorage.removeItem('openclaw_conversation_id');
                    set({ conversationId: null });
                }
            }
            return;
        }
        
        const data = await res.json();
        if (data && Array.isArray(data.messages)) {
            // Transform backend messages to frontend format
            const messages: Message[] = [];
            let currentAssistantMsg: Message | null = null;

            for (const msg of data.messages) {
                if (msg.role === 'user') {
                    if (currentAssistantMsg) {
                        messages.push(currentAssistantMsg);
                        currentAssistantMsg = null;
                    }
                    messages.push({
                        id: msg.id,
                        role: 'user',
                        content: msg.content || '',
                        timestamp: new Date(msg.created_at).getTime(),
                        toolCalls: [],
                        steps: []
                    });
                } else if (msg.role === 'assistant') {
                    // Try to merge with previous assistant message to reconstruct the "turn"
                    if (currentAssistantMsg) {
                        // We already have an assistant message pending.
                        // Append content if any
                         if (msg.content) {
                            currentAssistantMsg.content += msg.content;
                            
                            // Also update the text step if the last step was text, or create new one
                            const lastStep = currentAssistantMsg.steps![currentAssistantMsg.steps!.length - 1];
                            if (lastStep && lastStep.type === 'text') {
                                lastStep.content += msg.content;
                            } else {
                                currentAssistantMsg.steps!.push({
                                    id: `step_${msg.id}_text`,
                                    type: 'text',
                                    content: msg.content
                                });
                            }
                        }
                        
                        // Append tool calls if any
                        const newToolCalls = typeof msg.tool_calls === 'string' ? JSON.parse(msg.tool_calls) : (msg.tool_calls || []);
                        if (newToolCalls.length > 0) {
                            currentAssistantMsg.toolCalls = [...(currentAssistantMsg.toolCalls || []), ...newToolCalls];
                            currentAssistantMsg.steps!.push({
                                id: `step_${msg.id}_tool`,
                                type: 'tool',
                                toolCalls: newToolCalls
                            });
                        }
                    } else {
                        // Start new assistant message
                        currentAssistantMsg = {
                            id: msg.id,
                            role: 'assistant',
                            content: msg.content || '',
                            timestamp: new Date(msg.created_at).getTime(),
                            toolCalls: typeof msg.tool_calls === 'string' ? JSON.parse(msg.tool_calls) : (msg.tool_calls || []),
                            steps: []
                        };
                        
                        // If it has content, add text step
                        if (msg.content) {
                            currentAssistantMsg.steps!.push({
                                id: `step_${msg.id}_text`,
                                type: 'text',
                                content: msg.content
                            });
                        }
                        // If it has tool_calls, add tool step
                        if (currentAssistantMsg.toolCalls && currentAssistantMsg.toolCalls.length > 0) {
                                currentAssistantMsg.steps!.push({
                                id: `step_${msg.id}_tool`,
                                type: 'tool',
                                toolCalls: currentAssistantMsg.toolCalls
                            });
                        }
                    }
                } else if (msg.role === 'tool') {
                    // Tool execution result
                    if (currentAssistantMsg) {
                        const result = msg.content;
                        const toolCallId = msg.tool_call_id;
                        
                        if (toolCallId) {
                            // Update in toolCalls array
                            const tcIndex = currentAssistantMsg.toolCalls?.findIndex(tc => tc.id === toolCallId);
                            if (tcIndex !== undefined && tcIndex !== -1 && currentAssistantMsg.toolCalls) {
                                currentAssistantMsg.toolCalls[tcIndex].result = result;
                            }
                            
                            // Update in steps
                            currentAssistantMsg.steps?.forEach(step => {
                                if (step.type === 'tool' && step.toolCalls) {
                                    const sTcIndex = step.toolCalls.findIndex(tc => tc.id === toolCallId);
                                    if (sTcIndex !== -1) {
                                        step.toolCalls[sTcIndex].result = result;
                                    }
                                }
                            });
                        }
                    }
                }
            }
            
            if (currentAssistantMsg) {
                messages.push(currentAssistantMsg);
            }
            
            // Save ID and update state
            localStorage.setItem('openclaw_conversation_id', id);
            set({ messages, conversationId: id });
        }
    } catch (e) {
        console.error('Failed to load conversation:', e);
    }
  },

  restoreHistory: async () => {
    const savedId = localStorage.getItem('openclaw_conversation_id');
    if (!savedId) return;
    await get().loadConversation(savedId);
  },

  addUserMessage: (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now()
    };
    set({ messages: [...get().messages, userMessage] });
  },

  sendMessage: async (content: string) => {
    get().addUserMessage(content);
    set({ loading: true, streaming: true, currentStreamContent: '' });

    // Ensure we have a conversation ID locally, or let backend generate it and we catch it?
    // We need to persist it. Since backend generates it if missing, we need to read it from response/context?
    // Wait, stream endpoint response doesn't return the ID explicitly in the header easily accessible via EventSource unless we send it in body.
    // Better: Generate on frontend if missing, or use the one we have.
    let convId = get().conversationId;
    // Actually, we can just let backend generate, but we won't know what it is to save it for next refresh!
    // So frontend MUST send it if we want to persist it.
    // If we don't have one, we can't generate a valid UUID v4 easily without a library on frontend (uuid package might not be there).
    // But we can use crypto.randomUUID() if available.
    
    if (!convId) {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            convId = crypto.randomUUID();
        } else {
            // Fallback
            convId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        localStorage.setItem('openclaw_conversation_id', convId);
        set({ conversationId: convId });
    }

    // Create a placeholder assistant message for streaming updates
    const assistantId = `${Date.now()}_assistant`;
    const placeholder: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      toolCalls: [],
      steps: []
    };
    set({ messages: [...get().messages, placeholder] });

    const updateAssistant = (updater: (m: Message) => Message) => {
      set(state => ({
        messages: state.messages.map(m => (m.id === assistantId ? updater(m) : m))
      }));
    };

    try {
      // Get current settings and context
      const settings = useSettingsStore.getState().settings;
      const openclawState = useOpenClawStore.getState();
      const context = {
        workspacePath: openclawState.workspacePath,
        gatewayRunning: openclawState.status.running,
      };

      // Use SSE streaming endpoint
      const payload = {
        messages: get().messages.filter(m => m.id !== assistantId),
        context,
        settings,
        conversationId: convId // Pass ID to backend
      };

      const resp = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`Stream request failed: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE events are separated by double newlines
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const line = part.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
          const json = line.slice(6);
          let evt: any;
          try {
            evt = JSON.parse(json);
          } catch {
            continue;
          }

          if (evt.type === 'delta' && typeof evt.content === 'string') {
            updateAssistant(m => {
              const newContent = (m.content || '') + evt.content;
              const steps = [...(m.steps || [])];
              const lastStep = steps[steps.length - 1];

              // 如果最后一个步骤是文本，追加内容
              if (lastStep && lastStep.type === 'text') {
                steps[steps.length - 1] = { 
                  ...lastStep, 
                  content: (lastStep.content || '') + evt.content 
                };
              } else {
                // 否则新建一个文本步骤
                steps.push({
                  id: `step_${Date.now()}_${steps.length}`,
                  type: 'text',
                  content: evt.content
                });
              }

              return { ...m, content: newContent, steps };
            });
            continue;
          }

          if (evt.type === 'tool_calls' && Array.isArray(evt.toolCalls)) {
            updateAssistant(m => {
              const steps = [...(m.steps || [])];
              // 新增一个工具调用步骤
              steps.push({
                id: `step_${Date.now()}_${steps.length}`,
                type: 'tool',
                toolCalls: evt.toolCalls
              });
              
              return { 
                ...m, 
                toolCalls: evt.toolCalls, // 注意：这里可能需要累加如果后端分多次发，但后端是一次性发的
                steps 
              };
            });
            continue;
          }

          if (evt.type === 'tool_result' && evt.toolCall) {
            updateAssistant((m) => {
              const steps = [...(m.steps || [])];
              // 更新对应的 tool step
              // 假设 toolCallId 是唯一的，我们需要找到包含这个 call 的 step
              const targetCallId = evt.toolCall.id;
              
              const newSteps = steps.map(step => {
                if (step.type === 'tool' && step.toolCalls) {
                  const callIndex = step.toolCalls.findIndex((c: any) => c.id === targetCallId);
                  if (callIndex !== -1) {
                    const newCalls = [...step.toolCalls];
                    newCalls[callIndex] = { ...newCalls[callIndex], ...evt.toolCall };
                    return { ...step, toolCalls: newCalls };
                  }
                }
                return step;
              });

              // 同时更新总的 toolCalls (为了兼容性)
              const list = Array.isArray(m.toolCalls) ? [...m.toolCalls] : [];
              const idx = list.findIndex((x: any) => x?.id === targetCallId);
              if (idx >= 0) {
                list[idx] = { ...list[idx], ...evt.toolCall };
              } else {
                list.push(evt.toolCall);
              }

              return { ...m, toolCalls: list, steps: newSteps };
            });
            continue;
          }

          if (evt.type === 'done') {
            // Ensure final content is set
            if (typeof evt.content === 'string') {
               // 如果 done 事件包含完整内容，这里其实不太好处理 steps
               // 但我们的后端实现里，done 事件是最后的汇总，前面的 delta 已经发了
               // 所以通常这里不需要做什么，除非为了保险更新 content
               updateAssistant(m => ({ ...m, content: evt.content })); 
            }
            set({ loading: false, streaming: false });
            return;
          }

          if (evt.type === 'error') {
            const errorPrefix = i18n.t('common.error');
            const unknownError = i18n.t('chat.systemError');
            const errorMessage = `\n\n[${errorPrefix}] ${evt.message || unknownError}`;
            
            updateAssistant(m => ({ 
              ...m, 
              content: (m.content || '') + errorMessage,
              steps: [...(m.steps || []), {
                id: `error_${Date.now()}`,
                type: 'text',
                content: errorMessage
              }]
            }));
            set({ loading: false, streaming: false });
            return;
          }
        }
      }

      set({ loading: false, streaming: false });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      const errorPrefix = i18n.t('chat.systemError');
      const errorMessage = `\n\n[${errorPrefix}] ${error?.message || 'Failed to send message'}`;
      
      updateAssistant(m => ({
        ...m,
        content: (m.content || '') + errorMessage,
        steps: [...(m.steps || []), {
            id: `error_${Date.now()}`,
            type: 'text',
            content: errorMessage
        }]
      }));
      set({ loading: false, streaming: false });
    }
  },

  finishStream: () => {
    // TODO: Implement actual streaming finish logic
  },

  clearMessages: () => set({ messages: [] })
}));
