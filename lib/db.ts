import * as SQLite from 'expo-sqlite';

const dbName = 'redroid.db';

export interface ChatMessage {
  id: string;
  session_id: string;
  sender: 'user' | 'ai' | 'tool';
  text: string;
  created_at: number;
}

export interface TerminalHistoryItem {
  id: number;
  command: string;
  output: string;
  created_at: number;
}

let db: SQLite.SQLiteDatabase | null = null;

async function getDb() {
  if (!db) {
    db = await SQLite.openDatabaseAsync(dbName);
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        sender TEXT,
        text TEXT,
        created_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS terminal_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        command TEXT,
        output TEXT,
        created_at INTEGER
      );
    `);
  }
  return db;
}

export async function saveChatMessage(message: ChatMessage) {
  try {
    const database = await getDb();
    await database.runAsync(
      'INSERT OR REPLACE INTO chat_messages (id, session_id, sender, text, created_at) VALUES (?, ?, ?, ?, ?)',
      message.id,
      message.session_id,
      message.sender,
      message.text,
      message.created_at
    );
  } catch (error) {
    console.error('Failed to save chat message:', error);
  }
}

export async function getChatHistory(sessionId: string = 'default'): Promise<ChatMessage[]> {
  try {
    const database = await getDb();
    const result = await database.getAllAsync<ChatMessage>(
      'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC',
      sessionId
    );
    return result;
  } catch (error) {
    console.error('Failed to get chat history:', error);
    return [];
  }
}

export async function clearChatHistory(sessionId: string = 'default') {
  try {
    const database = await getDb();
    await database.runAsync('DELETE FROM chat_messages WHERE session_id = ?', sessionId);
  } catch (error) {
    console.error('Failed to clear chat history:', error);
  }
}

export async function saveTerminalCommand(command: string, output: string) {
  try {
    const database = await getDb();
    await database.runAsync(
      'INSERT INTO terminal_history (command, output, created_at) VALUES (?, ?, ?)',
      command,
      output,
      Date.now()
    );
  } catch (error) {
    console.error('Failed to save terminal command:', error);
  }
}

export async function getTerminalHistory(limit: number = 100): Promise<TerminalHistoryItem[]> {
  try {
    const database = await getDb();
    const result = await database.getAllAsync<TerminalHistoryItem>(
      'SELECT * FROM terminal_history ORDER BY created_at DESC LIMIT ?',
      limit
    );
    return result;
  } catch (error) {
    console.error('Failed to get terminal history:', error);
    return [];
  }
}

export async function clearTerminalHistory() {
  try {
    const database = await getDb();
    await database.runAsync('DELETE FROM terminal_history');
  } catch (error) {
    console.error('Failed to clear terminal history:', error);
  }
}
