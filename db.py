"""SQLite storage for users, sessions, and tasks (stdlib only)."""

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(ROOT, 'data', 'tasks.db')
JSON_FILE = os.path.join(ROOT, 'data', 'tasks.json')


def get_connection():
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_task(row):
    return {
        'id': row['id'],
        'text': row['text'],
        'done': bool(row['done']),
        'category': row['category'],
        'dueDate': row['due_date'],
        'createdAt': row['created_at'],
    }


def row_to_user(row):
    return {
        'id': row['id'],
        'username': row['username'],
        'createdAt': row['created_at'],
    }


def init_db():
    with get_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')
        conn.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                text TEXT NOT NULL,
                done INTEGER NOT NULL DEFAULT 0,
                category TEXT NOT NULL DEFAULT 'personal',
                due_date TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')

        columns = {row[1] for row in conn.execute('PRAGMA table_info(tasks)')}
        if 'user_id' not in columns:
            conn.execute('ALTER TABLE tasks ADD COLUMN user_id TEXT')

        count = conn.execute('SELECT COUNT(*) FROM tasks WHERE user_id IS NULL').fetchone()[0]
        if count == 0 and os.path.exists(JSON_FILE):
            migrate_from_json(conn)


def migrate_from_json(conn):
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        tasks = json.load(f)

    for task in tasks:
        conn.execute(
            '''INSERT OR IGNORE INTO tasks
               (id, user_id, text, done, category, due_date, created_at)
               VALUES (?, NULL, ?, ?, ?, ?, ?)''',
            (
                task['id'],
                task['text'],
                int(task.get('done', False)),
                task.get('category', 'personal'),
                task.get('dueDate'),
                task['createdAt'],
            ),
        )

    print(f'Migrated {len(tasks)} legacy task(s) from tasks.json (no user assigned)')


def create_user(username, password_hash):
    user_id = uuid.uuid4().hex[:12]
    created_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
            (user_id, username, password_hash, created_at),
        )
    return row_to_user({
        'id': user_id,
        'username': username,
        'created_at': created_at,
    })


def get_user_by_username(username):
    with get_connection() as conn:
        row = conn.execute(
            'SELECT * FROM users WHERE username = ?', (username,)
        ).fetchone()
    if not row:
        return None
    return {'id': row['id'], 'username': row['username'], 'password_hash': row['password_hash']}


def create_session(user_id, token):
    created_at = datetime.now(timezone.utc).isoformat()
    with get_connection() as conn:
        conn.execute(
            'INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)',
            (token, user_id, created_at),
        )


def get_user_by_token(token):
    with get_connection() as conn:
        row = conn.execute('''
            SELECT users.id, users.username, users.created_at
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?
        ''', (token,)).fetchone()
    return row_to_user(row) if row else None


def delete_session(token):
    with get_connection() as conn:
        conn.execute('DELETE FROM sessions WHERE token = ?', (token,))


def get_all_tasks(user_id):
    with get_connection() as conn:
        rows = conn.execute(
            '''SELECT * FROM tasks WHERE user_id = ?
               ORDER BY done ASC, due_date ASC, created_at ASC''',
            (user_id,),
        ).fetchall()
    return [row_to_task(row) for row in rows]


def create_task(task, user_id):
    with get_connection() as conn:
        conn.execute(
            '''INSERT INTO tasks (id, user_id, text, done, category, due_date, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (
                task['id'],
                user_id,
                task['text'],
                int(task['done']),
                task['category'],
                task.get('dueDate'),
                task['createdAt'],
            ),
        )
    return task


def update_task(task_id, updates, user_id):
    fields = []
    values = []

    if 'done' in updates:
        fields.append('done = ?')
        values.append(int(updates['done']))
    if 'text' in updates:
        fields.append('text = ?')
        values.append(updates['text'])
    if 'category' in updates:
        fields.append('category = ?')
        values.append(updates['category'])
    if 'dueDate' in updates:
        fields.append('due_date = ?')
        values.append(updates['dueDate'])

    if not fields:
        return get_task(task_id, user_id)

    values.extend([task_id, user_id])
    with get_connection() as conn:
        cursor = conn.execute(
            f'UPDATE tasks SET {", ".join(fields)} WHERE id = ? AND user_id = ?',
            values,
        )
        if cursor.rowcount == 0:
            return None
    return get_task(task_id, user_id)


def get_task(task_id, user_id):
    with get_connection() as conn:
        row = conn.execute(
            'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
            (task_id, user_id),
        ).fetchone()
    return row_to_task(row) if row else None


def delete_task(task_id, user_id):
    with get_connection() as conn:
        cursor = conn.execute(
            'DELETE FROM tasks WHERE id = ? AND user_id = ?',
            (task_id, user_id),
        )
        return cursor.rowcount > 0


def clear_completed(user_id):
    with get_connection() as conn:
        conn.execute('DELETE FROM tasks WHERE done = 1 AND user_id = ?', (user_id,))
    return get_all_tasks(user_id)