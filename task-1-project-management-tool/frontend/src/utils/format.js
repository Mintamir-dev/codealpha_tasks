import { AVATAR_COLORS } from '../constants';

export function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = Array.from(parts[0])[0];
  const second = parts.length > 1 ? Array.from(parts[1])[0] : '';
  return (first + second).toUpperCase();
}

export function avatarColor(id) {
  return AVATAR_COLORS[Math.abs(Number(id) || 0) % AVATAR_COLORS.length];
}

// Dates from the API are 'YYYY-MM-DD'. Parse them as plain calendar dates (no time zone shift).
function fromDateString(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatShortDate(dateStr) {
  return fromDateString(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function formatLongDate(dateStr) {
  return fromDateString(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatIsoDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** '6 Oct, 14:20' */
export function formatDateTime(iso) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date}, ${time}`;
}

export function todayString() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in the browser's time zone
}

export function daysBetween(fromStr, toStr) {
  return Math.round((fromStr && toStr ? fromDateString(toStr) - fromDateString(fromStr) : 0) / 86400000);
}

export function overdueDays(dueDate) {
  return Math.max(0, daysBetween(dueDate, todayString()));
}

export function relativeTime(iso) {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return formatIsoDate(iso);
}

/** Label shown on a task card: Due 24 Oct, Overdue · 8 Oct, Done 2 Oct, No due date. */
export function dueLabel(task) {
  if (task.status === 'done' && task.completedAt) {
    const d = new Date(task.completedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return { text: `Done ${d}`, danger: false };
  }
  if (!task.dueDate) return { text: 'No due date', danger: false };
  const short = formatShortDate(task.dueDate);
  if (task.isOverdue) return { text: `Overdue \u00B7 ${short}`, danger: true };
  return { text: `Due ${short}`, danger: false };
}
