import { getDb } from '../index';

export interface InitializationRecord {
  workspace_path: string;
  template_version?: string;
  status: 'SUCCESS' | 'FAILED';
  error_message?: string;
}

export const InitializationDAO = {
  logInitialization: (data: InitializationRecord) => {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO initialization (workspace_path, template_version, status, error_message)
      VALUES (@workspace_path, @template_version, @status, @error_message)
    `);
    return stmt.run(data);
  }
};
