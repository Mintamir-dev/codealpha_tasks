'use strict';

const { pool } = require('../../db/pool');

const SELECT_JOINED = `
  SELECT n.id, n.user_id, n.type, n.task_id, n.project_id, n.message, n.is_read, n.created_at,
         p.title AS project_title
    FROM notifications n
    LEFT JOIN projects p ON p.id = n.project_id`;

async function create({ userId, type, taskId = null, projectId = null, message }, db = pool) {
  const { rows } = await db.query(
    `WITH ins AS (
       INSERT INTO notifications (user_id, type, task_id, project_id, message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *
     )
     SELECT ins.id, ins.user_id, ins.type, ins.task_id, ins.project_id, ins.message, ins.is_read,
            ins.created_at, p.title AS project_title
       FROM ins LEFT JOIN projects p ON p.id = ins.project_id`,
    [userId, type, taskId, projectId, message]
  );
  return rows[0];
}

async function listForUser(userId, { unreadOnly = false, limit = 50 } = {}, db = pool) {
  const { rows } = await db.query(
    `${SELECT_JOINED}
      WHERE n.user_id = $1 AND ($2::boolean = false OR n.is_read = false)
      ORDER BY n.created_at DESC, n.id DESC
      LIMIT $3`,
    [userId, unreadOnly, limit]
  );
  return rows;
}

async function countUnread(userId, db = pool) {
  const { rows } = await db.query(
    'SELECT COUNT(*) AS n FROM notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return rows[0].n;
}

/** Returns the number of rows changed (0 => not found for this user). */
async function markRead(userId, id, db = pool) {
  const { rowCount } = await db.query(
    'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
    [id, userId]
  );
  return rowCount;
}

async function markAllRead(userId, db = pool) {
  await db.query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
}

module.exports = { create, listForUser, countUnread, markRead, markAllRead };
