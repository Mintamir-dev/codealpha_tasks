'use strict';

const { pool } = require('../../db/pool');
const { buildSet, likePattern } = require('../../db/sql');

const SELECT_TASK = `
  SELECT t.id, t.project_id, t.title, t.description, t.status, t.priority, t.assignee_id,
         t.due_date, t.position, t.created_by, t.blocked_reason, t.completed_at,
         t.created_at, t.updated_at,
         a.name AS assignee_name, c.name AS creator_name,
         (SELECT COUNT(*)::int FROM comments cm WHERE cm.task_id = t.id) AS comment_count
    FROM tasks t
    LEFT JOIN users a ON a.id = t.assignee_id
    LEFT JOIN users c ON c.id = t.created_by`;

const ORDER_BY = {
  board: 't.position ASC, t.id ASC',
  priority:
    "CASE t.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.due_date ASC NULLS LAST, t.id ASC",
  dueDate: 't.due_date ASC NULLS LAST, t.id ASC',
  name: 'lower(t.title) ASC, t.id ASC',
};

async function findById(id, db = pool) {
  const { rows } = await db.query(`${SELECT_TASK} WHERE t.id = $1`, [id]);
  return rows[0] || null;
}

/**
 * FR-TASK-13, 15, FR-SRCH-01..04: all filters are optional and combine with AND.
 * filters: { search, priority, status, assignee: number | 'none', dueFrom, dueTo, sort }
 */
async function listByProject(projectId, filters = {}, db = pool) {
  const where = ['t.project_id = $1'];
  const params = [projectId];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (filters.search) add('t.title ILIKE ?', likePattern(filters.search));
  if (filters.priority) add('t.priority = ?', filters.priority);
  if (filters.status) add('t.status = ?', filters.status);
  if (filters.assignee === 'none') where.push('t.assignee_id IS NULL');
  else if (filters.assignee != null) add('t.assignee_id = ?', filters.assignee);
  if (filters.dueFrom) {
    add('t.due_date >= ?', filters.dueFrom);
    add('t.due_date <= ?', filters.dueTo);
  }

  const orderBy = ORDER_BY[filters.sort] || ORDER_BY.board;
  const { rows } = await db.query(`${SELECT_TASK} WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`, params);
  return rows;
}

/** Next free position at the bottom of a column. */
async function nextPosition(projectId, status, db = pool) {
  const { rows } = await db.query(
    'SELECT COALESCE(MAX(position), 0) + 1 AS next FROM tasks WHERE project_id = $1 AND status = $2',
    [projectId, status]
  );
  return rows[0].next;
}

async function create(input, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO tasks (project_id, title, description, priority, assignee_id, due_date, position, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      input.projectId,
      input.title,
      input.description,
      input.priority,
      input.assigneeId || null,
      input.dueDate || null,
      input.position,
      input.createdBy,
    ]
  );
  return findById(rows[0].id, db);
}

async function update(id, patch, db = pool) {
  const { sets, values } = buildSet(patch, {
    title: 'title',
    description: 'description',
    priority: 'priority',
    dueDate: 'due_date',
    assigneeId: 'assignee_id',
    blockedReason: 'blocked_reason',
  });
  if (sets.length) {
    await db.query(`UPDATE tasks SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length + 1}`, [
      ...values,
      id,
    ]);
  }
  return findById(id, db);
}

/**
 * FR-TASK-05, FR-TASK-18, FR-TASK-16: sets status, keeps completed_at in step
 * (set when entering Done, cleared when leaving it) and keeps the blocked reason only while Blocked.
 * If `position` is given, the task is inserted at that place and later cards in the column shift down.
 */
async function setStatus(task, { status, blockedReason, position }, db = pool) {
  let newPosition = position;
  if (newPosition == null) {
    newPosition = status === task.status ? task.position : await nextPosition(task.project_id, status, db);
  } else {
    await db.query(
      `UPDATE tasks SET position = position + 1
        WHERE project_id = $1 AND status = $2 AND position >= $3 AND id <> $4`,
      [task.project_id, status, newPosition, task.id]
    );
  }

  await db.query(
    `UPDATE tasks
        SET status = $1::text,
            position = $2,
            blocked_reason = $3,
            completed_at = CASE WHEN $1::text = 'done' THEN COALESCE(completed_at, now()) ELSE NULL END,
            updated_at = now()
      WHERE id = $4`,
    [status, newPosition, status === 'blocked' ? blockedReason || null : null, task.id]
  );
  return findById(task.id, db);
}

async function remove(id, db = pool) {
  await db.query('DELETE FROM tasks WHERE id = $1', [id]);
}

module.exports = { findById, listByProject, nextPosition, create, update, setStatus, remove };
