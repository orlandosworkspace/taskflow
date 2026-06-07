const TOKEN_KEY = 'task_token';
const USER_KEY = 'task_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function authRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await response.json().catch(() => ({ error: 'Request failed' }));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export async function register(username, password) {
  const data = await authRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  saveSession(data.token, data.user);
  return data.user;
}

export async function login(username, password) {
  const data = await authRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  saveSession(data.token, data.user);
  return data.user;
}

export async function logout() {
  const token = getToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore network errors on logout
    }
  }
  clearSession();
}

export async function fetchCurrentUser() {
  const token = getToken();
  if (!token) return null;

  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    clearSession();
    return null;
  }

  const user = await response.json();
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}