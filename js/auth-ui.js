import { login, register, logout } from './auth.js';
import { setCurrentUser } from './state.js';

function showAuthError(message) {
  const banner = document.getElementById('auth-error');
  banner.textContent = message;
  banner.hidden = false;
}

function hideAuthError() {
  document.getElementById('auth-error').hidden = true;
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  document.getElementById('auth-title').textContent = isLogin ? 'Welcome back' : 'Create account';
  document.getElementById('auth-submit').textContent = isLogin ? 'Log in' : 'Sign up';
  document.getElementById('auth-switch-text').textContent = isLogin
    ? "Don't have an account?"
    : 'Already have an account?';
  document.getElementById('auth-switch-btn').textContent = isLogin ? 'Sign up' : 'Log in';
  document.getElementById('auth-panel').dataset.mode = mode;
  hideAuthError();
}

export function showAuthScreen() {
  document.getElementById('auth-screen').hidden = false;
  document.getElementById('app-screen').hidden = true;
}

export function showAppScreen(user) {
  setCurrentUser(user);
  document.getElementById('user-label').textContent = user.username;
  document.getElementById('user-avatar').textContent = user.username.charAt(0);
  document.getElementById('auth-screen').hidden = true;
  document.getElementById('app-screen').hidden = false;
}

export function initAuth(onAuthenticated) {
  const form = document.getElementById('auth-form');
  const switchBtn = document.getElementById('auth-switch-btn');

  setAuthMode('login');

  switchBtn.addEventListener('click', () => {
    const mode = document.getElementById('auth-panel').dataset.mode;
    setAuthMode(mode === 'login' ? 'register' : 'login');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAuthError();

    const username = document.getElementById('auth-username').value.trim();
    const password = document.getElementById('auth-password').value;
    const mode = document.getElementById('auth-panel').dataset.mode;

    try {
      const user = mode === 'login'
        ? await login(username, password)
        : await register(username, password);
      form.reset();
      await onAuthenticated(user);
    } catch (err) {
      showAuthError(err.message);
    }
  });

  document.getElementById('logout-btn').addEventListener('click', async () => {
    await logout();
    setCurrentUser(null);
    showAuthScreen();
    form.reset();
    setAuthMode('login');
  });
}