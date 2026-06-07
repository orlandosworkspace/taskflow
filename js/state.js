/** @typedef {{ id: string, text: string, done: boolean, category: string, createdAt: string }} Task */
/** @typedef {'all' | 'active' | 'done'} Filter */

/** @type {Task[]} */
export let tasks = [];

/** @type {Filter} */
export let filter = 'all';

/** @type {string} */
export let categoryFilter = 'all';

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