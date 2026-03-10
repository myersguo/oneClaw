import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessageStream, type StreamEvent } from '../services/api';
import { Send, Bot, Mic, SlidersHorizontal, ArrowUp, RefreshCw, Clock, BookOpen } from 'lucide-react';
import ModelSelector, { type ModelConfig } from './ModelSelector';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css'; // Light theme for code
import ToolCallDisplay, { type ToolCall } from './ToolCallDisplay';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

const DEFAULT_CONFIG: ModelConfig = {
    provider: 'custom',
    baseUrl: 'https://integration.coze.cn/api/v3',
    modelId: 'auto'
};

const ChatComponent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '你好，我是 OneClaw 助手。你可以向我咨询任何与 OneClaw 相关的问题。' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_CONFIG);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const apiMessages = [...messages, userMessage].map(m => ({
          role: m.role,
          content: m.content
      }));

      setMessages(prev => [...prev, { role: 'assistant', content: '', toolCalls: [] }]);

      await sendChatMessageStream(apiMessages, modelConfig, (event: StreamEvent) => {
          setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              
              if (lastMsg.role !== 'assistant') return newMessages;

              if (event.type === 'text' && event.content) {
                  lastMsg.content += event.content;
              } else if (event.type === 'error' && event.error) {
                  lastMsg.content += `\n\n[Error: ${event.error}]`;
              } else if (event.type === 'tool_start') {
                   const toolCall: ToolCall = {
                       id: `tool-${Date.now()}-${Math.random()}`,
                       name: event.tool || 'unknown_tool',
                       status: 'running',
                       input: event.input
                   };
                   lastMsg.toolCalls = [...(lastMsg.toolCalls || []), toolCall];
              } else if (event.type === 'tool_result') {
                   if (lastMsg.toolCalls && lastMsg.toolCalls.length > 0) {
                       const lastToolCall = lastMsg.toolCalls[lastMsg.toolCalls.length - 1];
                       if (lastToolCall.status === 'running') {
                           lastToolCall.status = 'completed';
                           lastToolCall.result = event.result;
                       }
                   }
              }
              
              return newMessages;
          });
      });
      
    } catch (error) {
      console.error(error);
      setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg.role === 'assistant') {
               if (!lastMsg.content && (!lastMsg.toolCalls || lastMsg.toolCalls.length === 0)) {
                   lastMsg.content = 'Sorry, I encountered an error. Please try again.';
               } else {
                   lastMsg.content += '\n\n[System Error: Connection failed]';
               }
          }
          return newMessages;
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 relative">
      {/* Header */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 bg-white z-10">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 text-blue-600">
                <Bot size={20} />
            </div>
            <div>
                <div className="font-semibold text-gray-900 text-sm flex items-center">
                    coClaw 
                    <span className="ml-2 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] rounded-full font-medium">智能助手</span>
                </div>
            </div>
          </div>
          <div className="flex items-center text-gray-400 space-x-3">
              <RefreshCw size={16} className="cursor-pointer hover:text-gray-600" />
              <Clock size={16} className="cursor-pointer hover:text-gray-600" />
              <BookOpen size={16} className="cursor-pointer hover:text-gray-600" />
          </div>
      </div>
      
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div 
              className={`max-w-[90%] ${
                msg.role === 'user' 
                  ? 'bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl rounded-tr-sm' 
                  : 'bg-transparent text-gray-900 w-full'
              }`}
            >
              {msg.role === 'user' ? (
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
              ) : (
                <div className="w-full">
                  {/* Tool Calls Display */}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mb-4 space-y-2">
                          {msg.toolCalls.map((toolCall, tIdx) => (
                              <ToolCallDisplay key={toolCall.id || tIdx} toolCall={toolCall} />
                          ))}
                      </div>
                  )}

                  {msg.content && (
                      <div className="markdown-body text-sm">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                                code({node, className, children, ...props}) {
                                    const match = /language-(\w+)/.exec(className || '')
                                    return match ? (
                                        <code className={`${className} block bg-gray-50 p-3 rounded-md my-2 overflow-x-auto text-xs`} {...props}>
                                            {children}
                                        </code>
                                    ) : (
                                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 text-xs font-mono" {...props}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {msg.content}
                        </ReactMarkdown>
                      </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1].role !== 'assistant' && (
          <div className="flex items-start">
             <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white">
        <div className="relative border border-gray-200 rounded-3xl bg-white shadow-sm focus-within:shadow-md transition-shadow">
          <textarea 
            className="w-full bg-transparent p-4 pr-12 text-gray-900 text-sm focus:outline-none resize-none min-h-[50px] max-h-[200px]"
            placeholder="告诉coClaw如何修改应用"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
            style={{ height: 'auto', minHeight: '50px' }}
          />
          
          <div className="flex items-center justify-between px-2 pb-2">
             <button 
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                    input.trim() 
                    ? 'bg-black text-white hover:bg-gray-800' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                onClick={handleSend}
                disabled={loading || !input.trim()}
             >
                <ArrowUp size={16} />
             </button>
          </div>
        </div>
        <div className="text-center mt-2 text-xs text-gray-300">
            内容由 AI 生成，请确认返回消息是否真实可靠
        </div>
      </div>
      
      {/* Settings Overlay or Component (Hidden for now, integrated logic into Chat) */}
      <div className="hidden">
         <ModelSelector config={modelConfig} onConfigChange={setModelConfig} />
      </div>
    </div>
  );
};

export default ChatComponent;
