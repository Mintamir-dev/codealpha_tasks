'use strict';

const { withTransaction } = require('../../db/pool');
const { forbidden, notFound } = require('../../utils/httpError');
const { findMentionedUserIds } = require('../../utils/mentions');
const { canDeleteComment, canEditComment } = require('../../utils/permissions');
const realtime = require('../../realtime/socket');
const projectsRepo = require('../projects/projects.repository');
const projectsService = require('../projects/projects.service');
const notifications = require('../notifications/notifications.service');
const repo = require('./comments.repository');
const { toComment } = require('./comments.mapper');

/** The comment must exist and belong to the task in the URL. */
async function findCommentOfTask(taskId, commentId) {
  const row = await repo.findById(commentId);
  if (!row || row.task_id !== taskId) throw notFound('Comment not found', 'COMMENT_NOT_FOUND');
  return row;
}

/** FR-COMM-02, FR-COMM-03 (membership is checked by the loadTask middleware). */
async function listComments(user, role, taskRow) {
  const rows = await repo.listByTask(taskRow.id);
  return { comments: rows.map((row) => toComment(row, { id: user.id, role })) };
}

/** FR-COMM-01, FR-COMM-06, FR-NOTIF-02, FR-NOTIF-06 */
async function createComment(user, project, role, taskRow, { text }) {
  const members = await projectsRepo.listMemberNames(project.id);
  const mentionedIds = findMentionedUserIds(text, members).filter((id) => id !== user.id);

  const { row, created } = await withTransaction(async (client) => {
    const comment = await repo.create({ taskId: taskRow.id, userId: user.id, text }, client);
    const items = [];

    for (const userId of mentionedIds) {
      items.push({
        userId,
        type: 'mention',
        taskId: taskRow.id,
        projectId: project.id,
        message: notifications.messages.mention(user.name, taskRow.title),
        actorId: user.id,
      });
    }
    // The assignee hears about the comment unless they were already told about the mention.
    const assigneeId = taskRow.assignee_id;
    if (assigneeId && assigneeId !== user.id && !mentionedIds.includes(assigneeId)) {
      items.push({
        userId: assigneeId,
        type: 'comment',
        taskId: taskRow.id,
        projectId: project.id,
        message: notifications.messages.comment(user.name, taskRow.title),
        actorId: user.id,
      });
    }
    return { row: comment, created: await notifications.createMany(items, client) };
  });

  realtime.toProject(project.id, 'comment:added', {
    projectId: project.id,
    taskId: taskRow.id,
    actorId: user.id,
    comment: toComment(row),
  });
  notifications.publish(created);
  return { comment: toComment(row, { id: user.id, role }) };
}

/** FR-COMM-04 */
async function editComment(user, project, role, taskRow, commentId, { text }) {
  const existing = await findCommentOfTask(taskRow.id, commentId);
  if (!canEditComment(existing.user_id, user.id)) {
    throw forbidden('You can only edit your own comments', 'COMMENT_EDIT_FORBIDDEN');
  }
  const row = await repo.updateText(commentId, text);
  realtime.toProject(project.id, 'comment:updated', {
    projectId: project.id,
    taskId: taskRow.id,
    actorId: user.id,
    comment: toComment(row),
  });
  return { comment: toComment(row, { id: user.id, role }) };
}

/** FR-COMM-04 (own comment), FR-COMM-05 (Manager moderates any comment) */
async function deleteComment(user, project, role, taskRow, commentId) {
  const existing = await findCommentOfTask(taskRow.id, commentId);
  if (!canDeleteComment(existing.user_id, user.id, role)) {
    throw forbidden('You can only delete your own comments', 'COMMENT_DELETE_FORBIDDEN');
  }
  await repo.remove(commentId);
  realtime.toProject(project.id, 'comment:deleted', {
    projectId: project.id,
    taskId: taskRow.id,
    commentId,
    actorId: user.id,
  });
  if (existing.user_id !== user.id) {
    await projectsService.logActivity({
      projectId: project.id,
      userId: user.id,
      action: 'comment.deleted',
      target: taskRow.title,
    });
  }
}

module.exports = { listComments, createComment, editComment, deleteComment };
