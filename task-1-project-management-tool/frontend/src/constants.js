// Class names are written out in full so Tailwind can find them.

export const STATUSES = ['todo', 'in_progress', 'done', 'blocked'];

export const STATUS_META = {
  todo: { label: 'To Do', dot: 'bg-st-todo', bar: 'border-t-st-todo' },
  in_progress: { label: 'In Progress', dot: 'bg-st-progress', bar: 'border-t-st-progress' },
  done: { label: 'Done', dot: 'bg-st-done', bar: 'border-t-st-done' },
  blocked: { label: 'Blocked', dot: 'bg-st-blocked', bar: 'border-t-st-blocked' },
};

export const PRIORITIES = ['high', 'medium', 'low'];

export const PRIORITY_META = {
  high: { label: 'High', cls: 'bg-danger-soft text-danger' },
  medium: { label: 'Medium', cls: 'bg-warn-soft text-warn' },
  low: { label: 'Low', cls: 'bg-[#e4e8ef] text-muted' },
};

export const PROJECT_STATUSES = ['active', 'on_hold', 'completed'];

export const PROJECT_STATUS_META = {
  active: { label: 'Active', cls: 'bg-brand-soft text-brand-dark', dot: 'bg-brand' },
  on_hold: { label: 'On Hold', cls: 'bg-warn-soft text-warn', dot: 'bg-st-blocked' },
  completed: { label: 'Completed', cls: 'bg-[#d9efe3] text-[#14653b]', dot: 'bg-st-done' },
};

export const AVATAR_COLORS = ['#0a5f58', '#1f5fcf', '#8a3c0a', '#5a6b82', '#7b3fa0', '#a8324a'];

export const TOKEN_KEY = 'pm_token';
