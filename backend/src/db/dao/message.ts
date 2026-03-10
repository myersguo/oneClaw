import { getDb } from '../index';
import { v4 as uuidv4 } from 'uuid';

export interface MessageRecord {
  id?: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content?: string;
  tool_calls?: any; // JSON string or object
  tool_call_id?: string;
}

export const MessageDAO = {
  addMessage: (message: MessageRecord) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, tool_calls, tool_call_id)
      VALUES (@id, @conversation_id, @role, @content, @tool_calls, @tool_call_id)
    `);
    
    return stmt.run({
        id: message.id || uuidv4(),
        conversation_id: message.conversation_id,
        role: message.role,
        content: message.content || null,
        tool_calls: message.tool_calls ? (typeof message.tool_calls === 'object' ? JSON.stringify(message.tool_calls) : message.tool_calls) : null,
        tool_call_id: message.tool_call_id || null
    });
  },

  getMessagesByConversationId: (conversationId: string) => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC');
    return stmt.all(conversationId);
  }
};
