import * as SQLite from 'expo-sqlite';

// New API in SDK 51+ (expo-sqlite v14+)
let dbInstance: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async () => {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('ecommerce_chat.db');
  }

  // Create tables using execAsync (for multiple statements or simple execution)
  await dbInstance.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      name TEXT,
      avatar TEXT,
      lastMessage TEXT,
      lastMessageTime INTEGER,
      unreadCount INTEGER DEFAULT 0,
      role TEXT,
      productId TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT,
      senderId TEXT,
      senderRole TEXT,
      content TEXT,
      type TEXT,
      createdAt INTEGER,
      isRecalled INTEGER DEFAULT 0,
      replyMessage TEXT,
      FOREIGN KEY (conversationId) REFERENCES conversations(id)
    );
  `);

  // Add column if not exists (ignore error if it already exists)
  try {
    await dbInstance.execAsync(`ALTER TABLE messages ADD COLUMN replyMessage TEXT;`);
  } catch (e) {}

  console.log('Database initialized successfully with new API');
};

let writeQueue = Promise.resolve();

export const saveConversation = async (conv: any) => {
  if (!dbInstance) dbInstance = await SQLite.openDatabaseAsync('ecommerce_chat.db');
  
  return (writeQueue = writeQueue.then(async () => {
    await dbInstance!.runAsync(
      `INSERT OR REPLACE INTO conversations (id, name, avatar, lastMessage, lastMessageTime, unreadCount, role, productId)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        conv.id, 
        conv.name, 
        conv.avatar, 
        conv.lastMessage || '', 
        conv.lastMessageTime || Date.now(),
        conv.unreadCount || 0,
        conv.role,
        conv.productId || ''
      ]
    );
  }).catch(console.error));
};

export const saveMessages = async (msgs: any[]) => {
  if (!dbInstance) dbInstance = await SQLite.openDatabaseAsync('ecommerce_chat.db');
  if (!msgs || msgs.length === 0) return;

  return (writeQueue = writeQueue.then(async () => {
    await dbInstance!.withTransactionAsync(async () => {
      for (const msg of msgs) {
        await dbInstance!.runAsync(
          `INSERT OR REPLACE INTO messages (id, conversationId, senderId, senderRole, content, type, createdAt, isRecalled, replyMessage)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            msg.id, 
            msg.conversationId, 
            msg.senderId, 
            msg.senderRole, 
            msg.content, 
            msg.type || 'TEXT', 
            new Date(msg.createdAt).getTime(),
            msg.isRecalled ? 1 : 0,
            msg.replyMessage ? JSON.stringify(msg.replyMessage) : null
          ]
        );
      }

      // Update last message in conversation based on the latest message provided
      const latestMsg = msgs[msgs.length - 1];
      await dbInstance!.runAsync(
        `UPDATE conversations SET lastMessage = ?, lastMessageTime = ? WHERE id = ?`,
        [latestMsg.content, new Date(latestMsg.createdAt).getTime(), latestMsg.conversationId]
      );
    });
  }).catch(console.error));
};

export const saveMessage = async (msg: any) => {
  return saveMessages([msg]);
};

export const getLocalConversations = async () => {
  if (!dbInstance) dbInstance = await SQLite.openDatabaseAsync('ecommerce_chat.db');
  return await dbInstance.getAllAsync('SELECT * FROM conversations ORDER BY lastMessageTime DESC');
};

export const getLocalMessages = async (conversationId: string) => {
  if (!dbInstance) dbInstance = await SQLite.openDatabaseAsync('ecommerce_chat.db');
  const rawData: any[] = await dbInstance.getAllAsync('SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt DESC', [conversationId]);
  return rawData.map(msg => ({
    ...msg,
    replyMessage: msg.replyMessage ? JSON.parse(msg.replyMessage) : null
  }));
};

export const recallLocalMessage = async (messageId: string) => {
  if (!dbInstance) dbInstance = await SQLite.openDatabaseAsync('ecommerce_chat.db');
  await dbInstance.runAsync(
    `UPDATE messages SET isRecalled = 1, content = 'Tin nhắn đã được thu hồi' WHERE id = ?`,
    [messageId]
  );
};

export const getDb = async () => {
  if (!dbInstance) dbInstance = await SQLite.openDatabaseAsync('ecommerce_chat.db');
  return dbInstance;
};
