import Database from "@tauri-apps/plugin-sql";
import { isTauriRuntime } from "./runtime";

type BrowserLog = { id: number; action: string; detail: string; created_at: string };

const DB_LOG_KEY = "monster-workbench-browser-logs";

function loadBrowserLogs(): BrowserLog[] {
  const raw = localStorage.getItem(DB_LOG_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as BrowserLog[];
  } catch {
    return [];
  }
}

function saveBrowserLogs(logs: BrowserLog[]) {
  localStorage.setItem(DB_LOG_KEY, JSON.stringify(logs));
}

class DbHelper {
  private dbInstance: Database | null = null;
  private dbName = "sqlite:monster_workbench.db";

  async getDb(): Promise<Database> {
    if (!this.dbInstance) {
      this.dbInstance = await Database.load(this.dbName);
    }
    return this.dbInstance;
  }

  async initTables(): Promise<void> {
    if (!isTauriRuntime()) {
      return;
    }

    const db = await this.getDb();
    await db.execute(`
      CREATE TABLE IF NOT EXISTS test_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        detail TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async execute(query: string, bindValues: any[] = []): Promise<any> {
    if (!isTauriRuntime()) {
      if (query.startsWith("INSERT INTO test_logs")) {
        const logs = loadBrowserLogs();
        const nextId = logs.length > 0 ? logs[0].id + 1 : 1;
        logs.unshift({
          id: nextId,
          action: String(bindValues[0] ?? ""),
          detail: String(bindValues[1] ?? ""),
          created_at: new Date().toISOString(),
        });
        saveBrowserLogs(logs);
        return { rowsAffected: 1 };
      }

      if (query.startsWith("DELETE FROM test_logs")) {
        saveBrowserLogs([]);
        return { rowsAffected: 0 };
      }

      return { rowsAffected: 0 };
    }

    const db = await this.getDb();
    return db.execute(query, bindValues);
  }

  async select<T = any>(query: string, bindValues: any[] = []): Promise<T[]> {
    if (!isTauriRuntime()) {
      if (query.startsWith("SELECT * FROM test_logs")) {
        return loadBrowserLogs() as T[];
      }
      return [];
    }

    const db = await this.getDb();
    return db.select<T[]>(query, bindValues);
  }
}

export const dbHelper = new DbHelper();
