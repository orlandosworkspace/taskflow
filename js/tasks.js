import { tasks, filter, categoryFilter, setTasks } from './state.js';
import {
  createTask,
  updateTask,
  removeTask,
  clearCompletedTasks,
} from './api.js';

export async function addTask(text, category) {
  const trimmed = text.trim();
  if (!trimmed) return;

  const task = await createTask(trimmed, category);
  tasks.push(task);
}

export async function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (!task) return;

  const updated = await updateTask(id, { done: !task.done });
  task.done = updated.done;
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
  let visible = [...tasks].sort((a, b) => Number(a.done) - Number(b.done));

  if (filter === 'active') visible = visible.filter((t) => !t.done);
  if (filter === 'done') visible = visible.filter((t) => t.done);
  if (categoryFilter !== 'all') visible = visible.filter((t) => t.category === categoryFilter);

  return visible;
}