'use strict';

/** `today` is 'YYYY-MM-DD' in the app time zone; used for the overdue flag (FR-TASK-14). */
function toTask(row, today) {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee: row.assignee_id ? { id: row.assignee_id, name: row.assignee_name } : null,
    dueDate: row.due_date,
    isOverdue: Boolean(row.due_date) && row.status !== 'done' && row.due_date < today,
    position: row.position,
    blockedReason: row.blocked_reason,
    completedAt: row.completed_at,
    // null when the creator deleted their account (shown as "Deleted user")
    createdBy: row.created_by ? { id: row.created_by, name: row.creator_name } : null,
    commentCount: row.comment_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = { toTask };
