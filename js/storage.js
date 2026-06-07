import { setTasks } from './state.js';
import { fetchTasks } from './api.js';

export async function loadTasks() {
  const tasks = await fetchTasks();
  setTasks(tasks);
}