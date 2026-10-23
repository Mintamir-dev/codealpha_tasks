'use strict';

const { canDeleteComment, canEditComment } = require('../../utils/permissions');

/**
 * `author` is null when the author deleted their account; the UI shows "Deleted user".
 * `author.role` is the author's current project role (the UI shows "(Manager)").
 * If `viewer` ({ id, role }) is given, the result also says what that viewer may do.
 */
function toComment(row, viewer) {
  const comment = {
    id: row.id,
    taskId: row.task_id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    edited: new Date(row.updated_at) > new Date(row.created_at),
    author: row.user_id ? { id: row.user_id, name: row.author_name, role: row.author_role || null } : null,
  };
  if (viewer) {
    comment.canEdit = canEditComment(row.user_id, viewer.id);
    comment.canDelete = canDeleteComment(row.user_id, viewer.id, viewer.role);
  }
  return comment;
}

module.exports = { toComment };
