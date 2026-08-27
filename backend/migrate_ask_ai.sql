-- Run this SQL on the Render/production database to add Ask AI tables
-- This is needed if the tables don't exist yet

CREATE TABLE IF NOT EXISTS ask_ai_conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ask_ai_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    role ENUM('user', 'bot') NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES ask_ai_conversations(id) ON DELETE CASCADE
);

-- For SQLite (if using SQLite fallback):
-- CREATE TABLE IF NOT EXISTS ask_ai_conversations (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     user_id INTEGER NOT NULL,
--     title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );

-- CREATE TABLE IF NOT EXISTS ask_ai_messages (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     conversation_id INTEGER NOT NULL,
--     role TEXT CHECK(role IN ('user', 'bot')) NOT NULL,
--     content TEXT NOT NULL,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
--     FOREIGN KEY (conversation_id) REFERENCES ask_ai_conversations(id) ON DELETE CASCADE
-- );
