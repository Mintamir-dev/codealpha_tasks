'use strict';

const { pool } = require('../../db/pool');

const SELECT_COMMENT = `
  SELECT c.id, c.task_id, c.user_id, c.text, c.created_at, c.updated_at,
         u.name AS author_name, pm.role AS author_role
    FROM comments c
    JOIN tasks t ON t.id = c.task_id
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = c.user_id`;

/** FR-COMM-02: oldest first. */
async function listByTask(taskId, db = pool) {
  const { rows } = await db.query(`${SELECT_COMMENT} WHERE c.task_id = $1 ORDER BY c.created_at ASC, c.id ASC`, [taskId]);
  return rows;
}

async function findById(id, db = pool) {
  const { rows } = await db.query(`${SELECT_COMMENT} WHERE c.id = $1`, [id]);
  return rows[0] || null;
}

async function create({ taskId, userId, text }, db = pool) {
  const { rows } = await db.query('INSERT INTO comments (task_id, user_id, text) VALUES ($1, $2, $3) RETURNING id', [
    taskId,
    userId,
    text,
  ]);
  return findById(rows[0].id, db);
}

async function updateText(id, text, db = pool) {
  await db.query('UPDATE comments SET text = $1, updated_at = now() WHERE id = $2', [text, id]);
  return findById(id, db);
}

async function remove(id, db = pool) {
  await db.query('DELETE FROM comments WHERE id = $1', [id]);
}

module.exports = { listByTask, findById, create, updateText, remove };
