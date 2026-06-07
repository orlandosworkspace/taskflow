import { fetchCurrentUser } from './auth.js';
import { initAuth, showAuthScreen, showAppScreen } from './auth-ui.js';
import { initPWA } from './pwa.js';
import { loadTasks } from './storage.js';
import { addTask, clearCompleted } from './tasks.js';
import { render, updateAddButton, initFilters, populateCategorySelect, withLoading } from './ui.js';

function initTaskForm() {
  const form = document.getElementById('add-form');
  const input = document.getElementById('task-input');
  const categoryInput = document.getElementById('category-input');
  const dueDateInput = document.getElementById('due-date-input');
  const clearBtn = document.getElementById('clear-done-btn');

  input.addEventListener('input', updateAddButton);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (input.value.trim() === '') {
      input.classList.add('shake');
      input.addEventListener('animationend', () => input.classList.remove('shake'), { once: true });
      return;
    }
    const text = input.value;
    const category = categoryInput.value;
    const dueDate = dueDateInput.value;
    input.value = '';
    dueDateInput.value = '';
    updateAddButton();
    withLoading(async () => {
      await addTask(text, category, dueDate);
      input.focus();
    });
  });

  clearBtn.addEventListener('click', () => {
    withLoading(() => clearCompleted());
  });
}

async function startApp(user) {
  showAppScreen(user);
  populateCategorySelect();
  initFilters();
  await withLoading(loadTasks);
  document.getElementById('task-input').focus();
  updateAddButton();
}

async function init() {
  initPWA();
  initTaskForm();

  initAuth(async (user) => {
    await startApp(user);
  });

  const user = await fetchCurrentUser();
  if (user) {
    await startApp(user);
  } else {
    showAuthScreen();
  }
}

document.addEventListener('DOMContentLoaded', init);