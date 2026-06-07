export const CATEGORIES = [
  { id: 'work', label: 'Work', color: '#4f46e5', bg: '#eef2ff' },
  { id: 'personal', label: 'Personal', color: '#059669', bg: '#ecfdf5' },
  { id: 'shopping', label: 'Shopping', color: '#d97706', bg: '#fffbeb' },
];

const byId = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return byId[id] || CATEGORIES[1];
}