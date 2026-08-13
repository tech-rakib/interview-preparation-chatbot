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

-- C (C Programming)
INSERT INTO questions (topic, question_text) VALUES
('C', 'What is a pointer in C and how does pointer arithmetic work?'),
('C', 'Explain the difference between malloc(), calloc(), realloc(), and free().'),
('C', 'What is a dangling pointer and how can memory leaks be avoided in C?'),
('C', 'Explain the difference between pass-by-value and pass-by-reference using pointers in C.'),
('C', 'What is the purpose of the volatile keyword in C?'),
('C', 'What is a structure in C, and how does structure padding affect its memory size?'),
('C', 'Explain the difference between a macro (#define) and an inline function in C.'),
('C', 'What is a NULL pointer versus a wild pointer in C?');

-- CPP (C++ Programming)
INSERT INTO questions (topic, question_text) VALUES
('CPP', 'What is the difference between references and pointers in C++?'),
('CPP', 'Explain the concepts of RAII and smart pointers (std::unique_ptr, std::shared_ptr, std::weak_ptr).'),
('CPP', 'What is a virtual function and how does the vtable work in C++?'),
('CPP', 'Explain the difference between std::vector and std::list in C++ STL.'),
('CPP', 'What is function overloading vs operator overloading in C++?'),
('CPP', 'What is the difference between copy constructor and assignment operator in C++?'),
('CPP', 'Explain template metaprogramming and how templates work in C++.'),
('CPP', 'What is the difference between private, protected, and public inheritance in C++?');

-- JAVA (Java Programming)
INSERT INTO questions (topic, question_text) VALUES
('JAVA', 'Explain the difference between JDK, JRE, and JVM.'),
('JAVA', 'How does Garbage Collection work in Java and what are different GC algorithms?'),
('JAVA', 'Explain why String is immutable in Java and how String Pool works.'),
('JAVA', 'What is the difference between abstract class and interface in Java (including Java 8+ features)?'),
('JAVA', 'Explain how HashMap works internally in Java (hash code, buckets, collision handling).'),
('JAVA', 'What is the difference between final, finally, and finalize in Java?'),
('JAVA', 'Explain multithreading in Java and how synchronization works with locks and synchronized blocks.'),
('JAVA', 'What is the difference between throw and throws in Java exception handling?');

-- CA (Computer Architecture)
INSERT INTO questions (topic, question_text) VALUES
('CA', 'Explain the difference between RISC and CISC architectures.'),
('CA', 'What is instruction pipelining and what are pipeline hazards (data, control, structural)?'),
('CA', 'Explain cache hierarchy (L1, L2, L3) and cache mapping techniques (direct, set associative, fully associative).'),
('CA', 'What is Von Neumann architecture and how does it differ from Harvard architecture?'),
('CA', 'What is the role of Arithmetic Logic Unit (ALU) and Program Counter (PC) in a CPU?'),
('CA', 'Explain the concept of memory interleaving and its performance benefits.'),
('CA', 'What is Direct Memory Access (DMA) and why is it used?'),
('CA', 'Explain branch prediction and why it is critical for modern superscalar processors.');

-- SAD (System Analysis and Design)
INSERT INTO questions (topic, question_text) VALUES
('SAD', 'What is the System Development Life Cycle (SDLC) and its key phases?'),
('SAD', 'Explain the difference between Waterfall and Agile software development methodologies.'),
('SAD', 'What is a Data Flow Diagram (DFD) and how does context level DFD differ from Level 1 DFD?'),
('SAD', 'Explain functional vs non-functional requirements with software examples.'),
('SAD', 'What is a Use Case Diagram and how does it help in system requirement gathering?'),
('SAD', 'Explain the concept of system feasibility study (technical, operational, economic).'),
('SAD', 'What is coupling and cohesion in software design, and why is high cohesion/low coupling desired?'),
('SAD', 'Explain software testing strategies: Unit Testing, Integration Testing, and System Testing.');

-- AI (Artificial Intelligence)
INSERT INTO questions (topic, question_text) VALUES
('AI', 'Explain the difference between Supervised, Unsupervised, and Reinforcement Learning.'),
('AI', 'What is the difference between Breadth-First Search, Depth-First Search, and A* Search in AI?'),
('AI', 'What is overfitting in Machine Learning and how can it be prevented?'),
('AI', 'Explain how Artificial Neural Networks (ANN) work, including forward propagation and backpropagation.'),
('AI', 'What is the difference between Classification and Regression problems?'),
('AI', 'Explain Turing Test and its significance in evaluating AI systems.'),
('AI', 'What is the difference between Precision, Recall, and F1-Score in ML model evaluation?'),
('AI', 'What is a Decision Tree algorithm and how does Information Gain / Entropy work?');

-- CP (Competitive Programming)
INSERT INTO questions (topic, question_text) VALUES
('CP', 'Problem: Two Sum\nGiven an array of integers nums and an integer target, write a function solution in C++/Python that returns indices of the two numbers such that they add up to target.\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]'),
('CP', 'Problem: Reverse a Linked List\nWrite a raw C++ or Python function to reverse a singly linked list and return its head node.\nInput: 1 -> 2 -> 3 -> 4 -> 5 -> NULL\nOutput: 5 -> 4 -> 3 -> 2 -> 1 -> NULL'),
('CP', 'Problem: Maximum Subarray Sum (Kadane''s Algorithm)\nGiven an integer array nums, find the subarray with the largest sum and write code to return its sum.\nInput: nums = [-2,1,-3,4,-1,2,1,-5,4]\nOutput: 6 (Subarray [4,-1,2,1])'),
('CP', 'Problem: Valid Parentheses\nGiven a string s containing just the characters ''('', '')'', ''{'', ''}'', ''['' and '']'', write a code solution to determine if the input string is valid.\nInput: s = "()[]{}"\nOutput: true'),
('CP', 'Problem: Palindrome Number\nGiven an integer x, write a function to return true if x is a palindrome, and false otherwise.\nInput: x = 121\nOutput: true'),
('CP', 'Problem: Binary Search\nGiven an array of integers nums which is sorted in ascending order, and an integer target, write a C++/Python solution to search target in nums.\nInput: nums = [-1,0,3,5,9,12], target = 9\nOutput: 4'),
('CP', 'Problem: Climbing Stairs (DP)\nYou are climbing a staircase. It takes n steps to reach the top. Each time you can either climb 1 or 2 steps. Write dynamic programming code to compute total distinct ways to reach top.\nInput: n = 3\nOutput: 3'),
('CP', 'Problem: Find Missing Number\nGiven an array nums containing n distinct numbers in the range [0, n], write code to return the only number in the range that is missing from the array.\nInput: nums = [3,0,1]\nOutput: 2');


