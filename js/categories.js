export const CATEGORIES = [
  { id: 'work', label: 'Work', color: '#2563eb', bg: '#eff6ff' },
  { id: 'personal', label: 'Personal', color: '#16a34a', bg: '#f0fdf4' },
  { id: 'shopping', label: 'Shopping', color: '#ea580c', bg: '#fff7ed' },
];

const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return byId[id] || CATEGORIES[1];
}