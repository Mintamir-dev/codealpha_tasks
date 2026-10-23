'use strict';

const { notFound } = require('../../utils/httpError');
const realtime = require('../../realtime/socket');
const repo = require('./notifications.repository');

const quote = (title) => `\u201C${title}\u201D`;

/** Message texts shown in the notification list (see the front-end design). */
const messages = {
  assigned: (actor, taskTitle) => `${actor} assigned you ${quote(taskTitle)}`,
  comment: (actor, taskTitle) => `${actor} commented on ${quote(taskTitle)}`,
  mention: (actor, taskTitle) => `${actor} mentioned you in a comment on ${quote(taskTitle)}`,
  statusChanged: (actor, taskTitle, statusLabel) => `${actor} changed ${quote(taskTitle)} to ${statusLabel}`,
  addedToProject: (actor, projectTitle) => `${actor} added you to the project ${quote(projectTitle)}`,
};

function toNotification(row) {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
    taskId: row.task_id,
    projectId: row.project_id,
    projectTitle: row.project_title || null,
  };
}

/**
 * Creates notifications inside the caller's transaction (`db`) and returns them.
 * Items: { userId, type, taskId?, projectId?, message, actorId }.
 * FR-NOTIF-07: nothing is created for the user who performed the action.
 * Call publish() on the result after the transaction has committed.
 */
async function createMany(items, db) {
  const created = [];
  for (const item of items) {
    if (item.userId === item.actorId) continue;
    const row = await repo.create(item, db);
    created.push({ userId: row.user_id, notification: toNotification(row) });
  }
  return created;
}

/** FR-RT-01: pushes new notifications to the connected user. */
function publish(created) {
  for (const { userId, notification } of created) {
    realtime.toUser(userId, 'notification:new', { notification });
  }
}

async function list(userId, { unread, limit }) {
  const [rows, unreadCount] = await Promise.all([
    repo.listForUser(userId, { unreadOnly: unread === 'true', limit }),
    repo.countUnread(userId),
  ]);
  return { notifications: rows.map(toNotification), unreadCount };
}

async function unreadCount(userId) {
  return { unreadCount: await repo.countUnread(userId) };
}

async function markRead(userId, id) {
  const changed = await repo.markRead(userId, id);
  if (!changed) throw notFound('Notification not found', 'NOTIFICATION_NOT_FOUND');
}

async function markAllRead(userId) {
  await repo.markAllRead(userId);
}

module.exports = { messages, createMany, publish, list, unreadCount, markRead, markAllRead };
