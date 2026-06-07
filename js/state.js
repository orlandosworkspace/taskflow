/** @typedef {{ id: string, text: string, done: boolean, category: string, dueDate: string | null, createdAt: string }} Task */
/** @typedef {'all' | 'active' | 'done'} Filter */

/** @type {Task[]} */
export let tasks = [];

/** @type {Filter} */
export let filter = 'all';

/** @type {string} */
export let categoryFilter = 'all';

/** @type {string | null} */
export let editingId = null;

/** @type {{ id: string, username: string } | null} */
export let currentUser = null;

/** @param {{ id: string, username: string } | null} next */
export function setCurrentUser(next) {
  currentUser = next;
}

/** @param {Task[]} next */
export function setTasks(next) {
  tasks = next;
}

/** @param {Filter} next */
export function setFilter(next) {
  filter = next;
}

/** @param {string} next */
export function setCategoryFilter(next) {
  categoryFilter = next;
}

/** @param {string | null} next */
export function setEditingId(next) {
  editingId = next;
}