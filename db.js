// db.js
const path = require('path');
const Database = require('better-sqlite3');

// 注意：使用者檔案名稱為「Porfolio.db」（保留原始拼字）。
const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'Porfolio.db');

let db;

function openDb() {
    if (db) return db;
    db = new Database(DB_FILE);
    
    // 啟用外鍵約束
    db.pragma('foreign_keys = ON');
    
    // 提升性能的設置
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    
    return db;
}

function normalizeParams(params) {
    if (!params) return [];
    return Array.isArray(params) ? params : [params];
}

function getSqlVerb(sql) {
    const s = String(sql || '').trim().toUpperCase();
    return s.split(/\s+/)[0] || '';
}

// 為兼容原代码，创建类似 MySQL 的查询接口
const pool = {
    async query(sql, params) {
        const database = openDb();
        const p = normalizeParams(params);
        const verb = getSqlVerb(sql);
        
        try {
            if (verb === 'SELECT' || verb === 'PRAGMA' || verb === 'WITH') {
                const stmt = database.prepare(sql);
                const rows = stmt.all(...p);
                return [rows];
            } else {
                const stmt = database.prepare(sql);
                const result = stmt.run(...p);
                
                // 模仿 mysql2 的返回格式
                return [{
                    insertId: result.lastInsertRowid,
                    affectedRows: result.changes,
                    changes: result.changes,
                    lastID: result.lastInsertRowid
                }];
            }
        } catch (err) {
            console.error('Database query error:', err.message, 'SQL:', sql);
            throw err;
        }
    }
};

async function initDb() {
    try {
        const database = openDb();

        // 啟用外鍵約束
        database.pragma('foreign_keys = ON');

        // 創建 users 表
        database.prepare(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        `).run();

        // 創建 messages 表
        database.prepare(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `).run();

        // 創建索引以提高查詢性能
        database.prepare('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)').run();
        database.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)').run();
        database.prepare('CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)').run();

        console.log(`SQLite database initialized successfully: ${DB_FILE}`);
        
        // 檢查是否有 admin 用戶，如果沒有則創建一個
        const adminCheck = database.prepare('SELECT id FROM users WHERE username = ?').get('admin');
        if (!adminCheck) {
            console.log('No admin user found. You may want to create one.');
        }
        
        return database;
    } catch (err) {
        console.error('Database initialization failed:', err);
        throw err;
    }
}

module.exports = { pool, initDb, DB_FILE, openDb };