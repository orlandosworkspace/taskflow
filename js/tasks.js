import { tasks, filter, categoryFilter, setTasks } from './state.js';
import { dueDateStatus } from './dates.js';
import {
  createTask,
  updateTask,
  removeTask,
  clearCompletedTasks,
} from './api.js';

export async function addTask(text, category, dueDate) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const task = await createTask(trimmed, category, dueDate);
  tasks.push(task);
}

export async function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const updated = await updateTask(id, { done: !task.done });
  task.done = updated.done;
}

export async function editTask(id, text, category, dueDate) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const updated = await updateTask(id, {
    text: trimmed,
    category,
    dueDate: dueDate || null,
  });
  const task = tasks.find((t) => t.id === id);
  if (task) {
    task.text = updated.text;
    task.category = updated.category;
    task.dueDate = updated.dueDate;
  }
}

function dueDateSortValue(task) {
  if (!task.dueDate) return '9999-99-99';
  const status = dueDateStatus(task.dueDate, task.done);
  if (status === 'overdue') return '0' + task.dueDate;
  if (status === 'today') return '1' + task.dueDate;
  return '2' + task.dueDate;
}

export async function deleteTask(id) {
  await removeTask(id);
  setTasks(tasks.filter((t) => t.id !== id));
}

export async function clearCompleted() {
  const remaining = await clearCompletedTasks();
  setTasks(remaining);
}

export function getVisibleTasks() {
  let visible = [...tasks].sort((a, b) => {
    const doneDiff = Number(a.done) - Number(b.done);
    if (doneDiff !== 0) return doneDiff;
    return dueDateSortValue(a).localeCompare(dueDateSortValue(b));
  });

  if (filter === 'active') visible = visible.filter((t) => !t.done);
  if (filter === 'done') visible = visible.filter((t) => t.done);
  if (categoryFilter !== 'all') visible = visible.filter((t) => t.category === categoryFilter);

  return visible;
}