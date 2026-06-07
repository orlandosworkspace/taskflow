import { getToken } from './auth.js';

const API_BASE = '/api/tasks';

async function request(url, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) return null;
  return response.json();
}

export function fetchTasks() {
  return request(API_BASE);
}

export function createTask(text, category, dueDate) {
  return request(API_BASE, {
    method: 'POST',
    body: JSON.stringify({ text, category, dueDate: dueDate || null }),
  });
}

export function updateTask(id, updates) {
  return request(`${API_BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export function removeTask(id) {
  return request(`${API_BASE}/${id}`, { method: 'DELETE' });
}

export function clearCompletedTasks() {
  return request(`${API_BASE}/clear-completed`, { method: 'POST' });
}