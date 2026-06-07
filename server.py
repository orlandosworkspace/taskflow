#!/usr/bin/env python3
"""Task manager API + static file server (stdlib only)."""

import json
import os
import re
import uuid
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler

import auth
import db

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(os.environ.get('PORT', 3000))
VALID_CATEGORIES = {'work', 'personal', 'shopping'}
DEFAULT_CATEGORY = 'personal'
DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')
USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_]{3,20}$')


def parse_due_date(value):
    if value is None or value == '':
        return None
    if not isinstance(value, str) or not DATE_PATTERN.match(value):
        return 'invalid'
    try:
        datetime.strptime(value, '%Y-%m-%d')
    except ValueError:
        return 'invalid'
    return value


def normalize_task(task):
    if task['category'] not in VALID_CATEGORIES:
        task['category'] = DEFAULT_CATEGORY
    if task.get('dueDate') is None:
        task['dueDate'] = None
    return task


class TaskHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {format % args}")

    def send_json(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        super().end_headers()

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode('utf-8'))

    def get_token(self):
        header = self.headers.get('Authorization', '')
        if header.startswith('Bearer '):
            return header[7:].strip()
        return None

    def get_current_user(self):
        token = self.get_token()
        if not token:
            return None
        return db.get_user_by_token(token)

    def require_user(self):
        user = self.get_current_user()
        if not user:
            self.send_json(401, {'error': 'Login required'})
            return None
        return user

    def do_GET(self):
        if self.path == '/api/health':
            self.send_json(200, {'status': 'ok', 'storage': 'sqlite', 'auth': True})
            return

        if self.path == '/api/auth/me':
            user = self.require_user()
            if user:
                self.send_json(200, user)
            return

        if self.path == '/api/tasks':
            user = self.require_user()
            if not user:
                return
            tasks = [normalize_task(t) for t in db.get_all_tasks(user['id'])]
            self.send_json(200, tasks)
            return

        super().do_GET()

    def do_POST(self):
        if self.path == '/api/auth/register':
            body = self.read_body()
            username = body.get('username', '').strip()
            password = body.get('password', '')

            if not USERNAME_PATTERN.match(username):
                self.send_json(400, {'error': 'Username must be 3-20 letters, numbers, or underscores'})
                return
            if len(password) < 6:
                self.send_json(400, {'error': 'Password must be at least 6 characters'})
                return
            if db.get_user_by_username(username):
                self.send_json(409, {'error': 'Username already taken'})
                return

            user = db.create_user(username, auth.hash_password(password))
            token = auth.create_token()
            db.create_session(user['id'], token)
            self.send_json(201, {'token': token, 'user': user})
            return

        if self.path == '/api/auth/login':
            body = self.read_body()
            username = body.get('username', '').strip()
            password = body.get('password', '')

            record = db.get_user_by_username(username)
            if not record or not auth.verify_password(password, record['password_hash']):
                self.send_json(401, {'error': 'Invalid username or password'})
                return

            user = {'id': record['id'], 'username': record['username']}
            token = auth.create_token()
            db.create_session(user['id'], token)
            self.send_json(200, {'token': token, 'user': user})
            return

        if self.path == '/api/auth/logout':
            token = self.get_token()
            if token:
                db.delete_session(token)
            self.send_json(200, {'ok': True})
            return

        if self.path == '/api/tasks':
            user = self.require_user()
            if not user:
                return

            body = self.read_body()
            text = body.get('text', '').strip()
            if not text:
                self.send_json(400, {'error': 'Task text is required'})
                return

            category = body.get('category', DEFAULT_CATEGORY)
            if category not in VALID_CATEGORIES:
                self.send_json(400, {'error': 'Invalid category'})
                return

            due_date = parse_due_date(body.get('dueDate'))
            if due_date == 'invalid':
                self.send_json(400, {'error': 'Invalid due date'})
                return

            task = normalize_task({
                'id': uuid.uuid4().hex[:12],
                'text': text,
                'done': False,
                'category': category,
                'dueDate': due_date,
                'createdAt': datetime.now(timezone.utc).isoformat(),
            })
            db.create_task(task, user['id'])
            self.send_json(201, task)
            return

        if self.path == '/api/tasks/clear-completed':
            user = self.require_user()
            if not user:
                return
            remaining = [normalize_task(t) for t in db.clear_completed(user['id'])]
            self.send_json(200, remaining)
            return

        self.send_json(404, {'error': 'Not found'})

    def do_PATCH(self):
        parts = self.path.split('/')
        if len(parts) == 4 and parts[1] == 'api' and parts[2] == 'tasks':
            user = self.require_user()
            if not user:
                return

            task_id = parts[3]
            body = self.read_body()
            updates = {}

            if 'done' in body:
                updates['done'] = bool(body['done'])
            if 'text' in body:
                text = body['text'].strip()
                if not text:
                    self.send_json(400, {'error': 'Task text is required'})
                    return
                updates['text'] = text
            if 'category' in body:
                if body['category'] not in VALID_CATEGORIES:
                    self.send_json(400, {'error': 'Invalid category'})
                    return
                updates['category'] = body['category']
            if 'dueDate' in body:
                due_date = parse_due_date(body['dueDate'])
                if due_date == 'invalid':
                    self.send_json(400, {'error': 'Invalid due date'})
                    return
                updates['dueDate'] = due_date

            task = db.update_task(task_id, updates, user['id'])
            if not task:
                self.send_json(404, {'error': 'Task not found'})
                return
            self.send_json(200, normalize_task(task))
            return

        self.send_json(404, {'error': 'Not found'})

    def do_DELETE(self):
        parts = self.path.split('/')
        if len(parts) == 4 and parts[1] == 'api' and parts[2] == 'tasks':
            user = self.require_user()
            if not user:
                return

            task_id = parts[3]
            if not db.delete_task(task_id, user['id']):
                self.send_json(404, {'error': 'Task not found'})
                return
            self.send_json(200, {'ok': True})
            return

        self.send_json(404, {'error': 'Not found'})


if __name__ == '__main__':
    db.init_db()
    server = HTTPServer(('', PORT), TaskHandler)
    print(f'Server running at http://localhost:{PORT}')
    print(f'Database: {db.DB_FILE}')
    print('Press Ctrl+C to stop')
    server.serve_forever()