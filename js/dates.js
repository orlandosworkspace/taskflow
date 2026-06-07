export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDueDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function dueDateStatus(dueDate, done) {
  if (!dueDate || done) return 'none';

  const today = todayString();
  if (dueDate < today) return 'overdue';
  if (dueDate === today) return 'today';
  return 'upcoming';
}