'use strict';

const TASK_STATUSES = ['todo', 'in_progress', 'done', 'blocked'];
const PRIORITIES = ['low', 'medium', 'high'];
const PROJECT_STATUSES = ['active', 'completed', 'on_hold'];
const PROJECT_ROLES = ['manager', 'member'];

const STATUS_LABELS = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
  blocked: 'Blocked',
};

module.exports = { TASK_STATUSES, PRIORITIES, PROJECT_STATUSES, PROJECT_ROLES, STATUS_LABELS };
