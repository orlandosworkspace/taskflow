import { tasks, filter, categoryFilter, setFilter, setCategoryFilter } from './state.js';
import { toggleTask, deleteTask, getVisibleTasks } from './tasks.js';
import { CATEGORIES, getCategory } from './categories.js';

const EMPTY_MESSAGES = {
  all: 'No tasks yet. Add one above!',
  active: 'No active tasks. You\'re all caught up!',
  done: 'No completed tasks yet.',
};

function setLoading(isLoading) {
  const main = document.querySelector('main');
  main.classList.toggle('loading', isLoading);
}

function showError(message) {
  const banner = document.getElementById('error-banner');
  banner.textContent = message;
  banner.hidden = false;
}

function hideError() {
  document.getElementById('error-banner').hidden = true;
}

export async function withLoading(action) {
  setLoading(true);
  hideError();
  try {
    await action();
    render();
  } catch (err) {
    showError(err.message || 'Something went wrong. Is the server running?');
  } finally {
    setLoading(false);
  }
}

function updateStats() {
  const footer = document.getElementById('task-footer');
  const stats = document.getElementById('task-stats');
  const clearBtn = document.getElementById('clear-done-btn');

  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const remaining = total - done;

  if (total === 0) {
    footer.hidden = true;
    return;
  }

  footer.hidden = false;

  if (done === 0) {
    stats.textContent = `${remaining} task${remaining === 1 ? '' : 's'} remaining`;
  } else if (remaining === 0) {
    stats.textContent = `All done — ${done} task${done === 1 ? '' : 's'} completed`;
  } else {
    stats.textContent = `${remaining} remaining, ${done} completed`;
  }

  clearBtn.hidden = done === 0;
}

export function updateAddButton() {
  const input = document.getElementById('task-input');
  const addBtn = document.getElementById('add-btn');
  const isLoading = document.querySelector('main').classList.contains('loading');
  addBtn.disabled = isLoading || input.value.trim() === '';
}

function updateFilterButtons() {
  const isLoading = document.querySelector('main').classList.contains('loading');

  for (const btn of document.querySelectorAll('.filter-btn')) {
    btn.classList.toggle('active', btn.dataset.filter === filter);
    btn.disabled = isLoading;
  }

  for (const btn of document.querySelectorAll('.category-btn')) {
    btn.classList.toggle('active', btn.dataset.category === categoryFilter);
    btn.disabled = isLoading;
  }
}

function emptyMessage() {
  if (tasks.length === 0) return EMPTY_MESSAGES.all;

  const hasStatusMatch = tasks.some((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const hasCategoryMatch = categoryFilter === 'all' ||
    tasks.some((t) => t.category === categoryFilter);

  if (!hasStatusMatch && filter !== 'all') return EMPTY_MESSAGES[filter];
  if (!hasCategoryMatch) {
    const cat = getCategory(categoryFilter);
    return `No ${cat.label.toLowerCase()} tasks yet.`;
  }

  return 'No tasks match these filters.';
}

function createCategoryBadge(categoryId) {
  const cat = getCategory(categoryId);
  const badge = document.createElement('span');
  badge.className = 'category-badge';
  badge.textContent = cat.label;
  badge.style.color = cat.color;
  badge.style.background = cat.bg;
  return badge;
}

export function render() {
  const list = document.getElementById('task-list');
  const empty = document.getElementById('empty-state');
  const visible = getVisibleTasks();

  list.innerHTML = '';
  updateFilterButtons();

  if (visible.length === 0) {
    empty.textContent = emptyMessage();
    empty.hidden = false;
    updateStats();
    return;
  }

  empty.hidden = true;

  for (const task of visible) {
    const li = document.createElement('li');
    li.className = 'task-item' + (task.done ? ' done' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => {
      withLoading(() => toggleTask(task.id));
    });

    const content = document.createElement('div');
    content.className = 'task-content';

    const span = document.createElement('span');
    span.className = 'task-text';
    span.textContent = task.text;

    content.append(createCategoryBadge(task.category), span);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      withLoading(() => deleteTask(task.id));
    });

    li.append(checkbox, content, deleteBtn);
    list.appendChild(li);
  }

  updateStats();
  updateAddButton();
}

export function initFilters() {
  for (const btn of document.querySelectorAll('.filter-btn')) {
    btn.addEventListener('click', () => {
      setFilter(/** @type {import('./state.js').Filter} */ (btn.dataset.filter));
      render();
    });
  }

  for (const btn of document.querySelectorAll('.category-btn')) {
    btn.addEventListener('click', () => {
      setCategoryFilter(btn.dataset.category);
      render();
    });
  }
}

export function populateCategorySelect() {
  const select = document.getElementById('category-input');
  select.innerHTML = CATEGORIES.map(
    (c) => `<option value="${c.id}">${c.label}</option>`
  ).join('');
}