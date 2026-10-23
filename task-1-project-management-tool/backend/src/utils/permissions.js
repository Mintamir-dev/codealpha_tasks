'use strict';

/**
 * Permission rules from the SRS permission matrix (section 2.2).
 * Pure functions, so they are easy to test. `role` is the user's project role.
 */

const isManager = (role) => role === 'manager';

/** Create task: Manager; members only if the Manager enabled it (FR-TASK-17). */
function canCreateTask(role, membersCanCreateTasks) {
  return isManager(role) || (role === 'member' && Boolean(membersCanCreateTasks));
}

/** Edit, assign and delete tasks: Manager only. */
function canManageTasks(role) {
  return isManager(role);
}

/** Change status: Manager (any task) or the assignee (own task). */
function canChangeStatus(role, assigneeId, userId) {
  return isManager(role) || (assigneeId != null && assigneeId === userId);
}

/** Edit own comment. */
function canEditComment(authorId, userId) {
  return authorId != null && authorId === userId;
}

/** Delete own comment, or any comment if Manager. */
function canDeleteComment(authorId, userId, role) {
  return canEditComment(authorId, userId) || isManager(role);
}

module.exports = {
  isManager,
  canCreateTask,
  canManageTasks,
  canChangeStatus,
  canEditComment,
  canDeleteComment,
};
