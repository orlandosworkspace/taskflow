#!/usr/bin/env python3
"""Task manager API + static file server (stdlib only)."""

import json
import os
import uuid
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(ROOT, 'data', 'tasks.json')
PORT = int(os.environ.get('PORT', 3000))
VALID_CATEGORIES = {'work', 'personal', 'shopping'}
DEFAULT_CATEGORY = 'personal'


def normalize_task(task):
    if 'category' not in task or task['category'] not in VALID_CATEGORIES:
        task['category'] = DEFAULT_CATEGORY
    return task


def read_tasks():
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        tasks = json.load(f)
    return [normalize_task(task) for task in tasks]


def write_tasks(tasks):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, indent=2)


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

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode('utf-8'))

    def do_GET(self):
        if self.path == '/api/health':
            self.send_json(200, {'status': 'ok'})
            return
        if self.path == '/api/tasks':
            self.send_json(200, read_tasks())
            return
        super().do_GET()

    def do_POST(self):
        if self.path == '/api/tasks':
            body = self.read_body()
            text = body.get('text', '').strip()
            if not text:
                self.send_json(400, {'error': 'Task text is required'})
                return

            category = body.get('category', DEFAULT_CATEGORY)
            if category not in VALID_CATEGORIES:
                self.send_json(400, {'error': 'Invalid category'})
                return

            task = {
                'id': uuid.uuid4().hex[:12],
                'text': text,
                'done': False,
                'category': category,
                'createdAt': datetime.now(timezone.utc).isoformat(),
            }
            tasks = read_tasks()
            tasks.append(task)
            write_tasks(tasks)
            self.send_json(201, task)
            return

        if self.path == '/api/tasks/clear-completed':
            tasks = read_tasks()
            remaining = [t for t in tasks if not t['done']]
            write_tasks(remaining)
            self.send_json(200, remaining)
            return

        self.send_json(404, {'error': 'Not found'})

    def do_PATCH(self):
        parts = self.path.split('/')
        if len(parts) == 4 and parts[1] == 'api' and parts[2] == 'tasks':
            task_id = parts[3]
            body = self.read_body()
            tasks = read_tasks()
            for task in tasks:
                if task['id'] == task_id:
                    if 'done' in body:
                        task['done'] = bool(body['done'])
                    if 'category' in body:
                        if body['category'] not in VALID_CATEGORIES:
                            self.send_json(400, {'error': 'Invalid category'})
                            return
                        task['category'] = body['category']
                    write_tasks(tasks)
                    self.send_json(200, task)
                    return
            self.send_json(404, {'error': 'Task not found'})
            return

        self.send_json(404, {'error': 'Not found'})

    def do_DELETE(self):
        parts = self.path.split('/')
        if len(parts) == 4 and parts[1] == 'api' and parts[2] == 'tasks':
            task_id = parts[3]
            tasks = read_tasks()
            updated = [t for t in tasks if t['id'] != task_id]
            if len(updated) == len(tasks):
                self.send_json(404, {'error': 'Task not found'})
                return
            write_tasks(updated)
            self.send_json(200, {'ok': True})
            return

        self.send_json(404, {'error': 'Not found'})


if __name__ == '__main__':
    server = HTTPServer(('', PORT), TaskHandler)
    print(f'Server running at http://localhost:{PORT}')
    print('Press Ctrl+C to stop')
    server.serve_forever()