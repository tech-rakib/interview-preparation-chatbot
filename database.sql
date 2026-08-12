-- ============================================================
-- AI Interview Prep Chatbot - Database Schema
-- ============================================================
-- Import with:  mysql -u root -p < database.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS interview_prep_chatbot
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE interview_prep_chatbot;

-- ------------------------------------------------------------
-- Users
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    plan          ENUM('free', 'pro') NOT NULL DEFAULT 'free',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Questions (question bank per topic)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS questions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    topic         VARCHAR(50) NOT NULL,
    question_text TEXT NOT NULL
);

-- ------------------------------------------------------------
-- Sessions (one interview session = one topic attempt)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    topic      VARCHAR(50) NOT NULL,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Messages (chat turns within a session)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    role       ENUM('user', 'bot') NOT NULL,
    content    TEXT NOT NULL,
    score      INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Sample questions for each topic
-- ------------------------------------------------------------

-- DSA (Data Structures & Algorithms)
INSERT INTO questions (topic, question_text) VALUES
('DSA', 'What is the difference between an array and a linked list?'),
('DSA', 'Explain how a hash table works and how collisions are handled.'),
('DSA', 'What is the time complexity of binary search, and why does it work only on sorted data?'),
('DSA', 'Describe how a binary search tree differs from a balanced binary search tree (e.g. AVL tree).'),
('DSA', 'What is the difference between BFS and DFS traversal on a graph?'),
('DSA', 'Explain how a min-heap is used to implement a priority queue.'),
('DSA', 'What is dynamic programming, and how does it differ from plain recursion?'),
('DSA', 'What is the time and space complexity of merge sort, and how does it compare to quicksort?');

-- OS (Operating Systems)
INSERT INTO questions (topic, question_text) VALUES
('OS', 'What is the difference between a process and a thread?'),
('OS', 'Explain the concept of a deadlock and the four necessary conditions for it to occur.'),
('OS', 'What is virtual memory and why is it used?'),
('OS', 'Describe the difference between paging and segmentation.'),
('OS', 'What is a race condition, and how can it be prevented?'),
('OS', 'Explain the difference between preemptive and non-preemptive scheduling.'),
('OS', 'What is a semaphore and how does it differ from a mutex?'),
('OS', 'What happens during a context switch?');

-- DBMS (Database Management Systems)
INSERT INTO questions (topic, question_text) VALUES
('DBMS', 'What is normalization and why is it important?'),
('DBMS', 'Explain the difference between primary key, foreign key, and unique key.'),
('DBMS', 'What are ACID properties in a database transaction?'),
('DBMS', 'What is the difference between a clustered and a non-clustered index?'),
('DBMS', 'Explain the difference between INNER JOIN and LEFT JOIN.'),
('DBMS', 'What is a deadlock in DBMS and how is it different from an OS deadlock?'),
('DBMS', 'What is the purpose of database indexing, and what are its trade-offs?'),
('DBMS', 'Explain the difference between SQL and NoSQL databases.');

-- OOP (Object-Oriented Programming)
INSERT INTO questions (topic, question_text) VALUES
('OOP', 'What are the four main principles of object-oriented programming?'),
('OOP', 'Explain the difference between method overloading and method overriding.'),
('OOP', 'What is the difference between an abstract class and an interface?'),
('OOP', 'What is polymorphism, and can you give a real-world example?'),
('OOP', 'Explain the concept of encapsulation and why it is useful.'),
('OOP', 'What is the difference between composition and inheritance?'),
('OOP', 'What is a constructor, and how does it differ from a destructor?'),
('OOP', 'Explain what a virtual function is and why it is used.');

-- CN (Computer Networks)
INSERT INTO questions (topic, question_text) VALUES
('CN', 'What is the difference between TCP and UDP?'),
('CN', 'Explain the OSI model and its seven layers.'),
('CN', 'What happens when you type a URL into a browser and press enter?'),
('CN', 'What is the difference between a hub, a switch, and a router?'),
('CN', 'Explain how DNS resolution works.'),
('CN', 'What is the difference between HTTP and HTTPS?'),
('CN', 'What is the three-way handshake in TCP?'),
('CN', 'What is NAT (Network Address Translation) and why is it used?');
