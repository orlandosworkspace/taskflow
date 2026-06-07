import { loadTasks } from './storage.js';
import { addTask, clearCompleted } from './tasks.js';
import { render, updateAddButton, initFilters, populateCategorySelect, withLoading } from './ui.js';

async function init() {
  populateCategorySelect();
  initFilters();

  const form = document.getElementById('add-form');
  const input = document.getElementById('task-input');
  const categoryInput = document.getElementById('category-input');
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
    input.value = '';
    updateAddButton();
    withLoading(async () => {
      await addTask(text, category);
      input.focus();
    });
  });

  clearBtn.addEventListener('click', () => {
    withLoading(() => clearCompleted());
  });

  await withLoading(loadTasks);
  input.focus();
  updateAddButton();
}

document.addEventListener('DOMContentLoaded', init);