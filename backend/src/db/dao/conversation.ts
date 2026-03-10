import { getDb } from '../index';

export interface Conversation {
  id: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
}

export const ConversationDAO = {
  createConversation: (id: string, title?: string) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO conversations (id, title)
      VALUES (?, ?)
    `);
    return stmt.run(id, title);
  },

  getConversation: (id: string): Conversation | undefined => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM conversations WHERE id = ?');
    return stmt.get(id) as Conversation | undefined;
  },
  
  ensureConversation: (id: string) => {
      const db = getDb();
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO conversations (id)
        VALUES (?)
      `);
      stmt.run(id);
  },

  getAllConversations: (): Conversation[] => {
    const db = getDb();
    const stmt = db.prepare('SELECT * FROM conversations ORDER BY created_at DESC');
    return stmt.all() as Conversation[];
  }
};
