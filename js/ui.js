import { tasks, filter, categoryFilter, editingId, setFilter, setCategoryFilter, setEditingId } from './state.js';
import { toggleTask, editTask, deleteTask, getVisibleTasks } from './tasks.js';
import { CATEGORIES, getCategory } from './categories.js';
import { formatDueDate, dueDateStatus } from './dates.js';

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

function createCategorySelect(selectedId) {
  const select = document.createElement('select');
  select.className = 'edit-category';
  select.innerHTML = CATEGORIES.map(
    (c) => `<option value="${c.id}"${c.id === selectedId ? ' selected' : ''}>${c.label}</option>`
  ).join('');
  return select;
}

function createDueDateInput(value) {
  const input = document.createElement('input');
  input.type = 'date';
  input.className = 'edit-due-date';
  input.value = value || '';
  return input;
}

function createDueDateBadge(task) {
  if (!task.dueDate) return null;

  const status = dueDateStatus(task.dueDate, task.done);
  const badge = document.createElement('span');
  badge.className = 'due-date-badge ' + status;

  if (status === 'overdue') {
    badge.textContent = `Overdue · ${formatDueDate(task.dueDate)}`;
  } else if (status === 'today') {
    badge.textContent = 'Due today';
  } else {
    badge.textContent = `Due ${formatDueDate(task.dueDate)}`;
  }

  return badge;
}

function createEditForm(task) {
  const form = document.createElement('div');
  form.className = 'edit-form';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit-input';
  input.value = task.text;

  const categorySelect = createCategorySelect(task.category);
  const dueDateInput = createDueDateInput(task.dueDate);

  const actions = document.createElement('div');
  actions.className = 'edit-actions';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'save-btn';
  saveBtn.textContent = 'Save';

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'cancel-btn';
  cancelBtn.textContent = 'Cancel';

  const save = () => {
    if (input.value.trim() === '') {
      input.classList.add('shake');
      input.addEventListener('animationend', () => input.classList.remove('shake'), { once: true });
      return;
    }
    withLoading(async () => {
      await editTask(task.id, input.value, categorySelect.value, dueDateInput.value);
      setEditingId(null);
    });
  };

  saveBtn.addEventListener('click', save);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') {
      setEditingId(null);
      render();
    }
  });
  cancelBtn.addEventListener('click', () => {
    setEditingId(null);
    render();
  });

  actions.append(saveBtn, cancelBtn);
  form.append(input, categorySelect, dueDateInput, actions);

  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });

  return form;
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
    const overdue = dueDateStatus(task.dueDate, task.done) === 'overdue';
    li.className = 'task-item' +
      (task.done ? ' done' : '') +
      (overdue ? ' overdue' : '') +
      (editingId === task.id ? ' editing' : '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.disabled = editingId === task.id;
    checkbox.addEventListener('change', () => {
      withLoading(() => toggleTask(task.id));
    });

    const content = document.createElement('div');
    content.className = 'task-content';

    if (editingId === task.id) {
      content.append(createEditForm(task));
    } else {
      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = task.text;
      span.title = 'Double-click to edit';
      span.addEventListener('dblclick', () => {
        setEditingId(task.id);
        render();
      });
      const meta = document.createElement('div');
      meta.className = 'task-meta';
      meta.append(createCategoryBadge(task.category));
      const dueBadge = createDueDateBadge(task);
      if (dueBadge) meta.append(dueBadge);
      content.append(meta, span);
    }

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    if (editingId !== task.id) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'edit-btn';
      editBtn.textContent = 'Edit';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', () => {
        setEditingId(task.id);
        render();
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = 'Remove';
      deleteBtn.addEventListener('click', () => {
        withLoading(() => deleteTask(task.id));
      });

      actions.append(editBtn, deleteBtn);
    }

    li.append(checkbox, content, actions);
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