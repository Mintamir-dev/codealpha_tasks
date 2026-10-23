'use strict';

const { pool } = require('../../db/pool');
const { buildSet, likePattern } = require('../../db/sql');

const PROJECT_COLUMNS =
  'id, title, description, status, end_date, owner_id, members_can_create_tasks, created_at, updated_at';

const TASK_TOTAL_SQL = '(SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id)';
const TASK_DONE_SQL = "(SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'done')";
const MEMBER_COUNT_SQL = '(SELECT COUNT(*)::int FROM project_members m WHERE m.project_id = p.id)';

/** Project + the caller's role (null if not a member). Returns null if the project does not exist. */
async function findWithRole(projectId, userId, db = pool) {
  const { rows } = await db.query(
    `SELECT p.id, p.title, p.status, p.members_can_create_tasks, pm.role AS my_role
       FROM projects p
       LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $2
      WHERE p.id = $1`,
    [projectId, userId]
  );
  return rows[0] || null;
}

async function listProjectIdsForUser(userId, db = pool) {
  const { rows } = await db.query('SELECT project_id FROM project_members WHERE user_id = $1', [userId]);
  return rows.map((r) => r.project_id);
}

/** Dashboard cards (FR-PROJ-05, FR-PROJ-10, FR-PROJ-12). */
async function listForUser(userId, { status, search } = {}, db = pool) {
  const { rows } = await db.query(
    `SELECT p.id, p.title, p.description, p.status, p.end_date, p.created_at, pm.role AS my_role,
            ${TASK_TOTAL_SQL} AS task_total, ${TASK_DONE_SQL} AS task_done, ${MEMBER_COUNT_SQL} AS member_count
       FROM projects p
       JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      WHERE ($2::text IS NULL OR p.status = $2)
        AND ($3::text IS NULL OR p.title ILIKE $3)
      ORDER BY p.created_at DESC, p.id DESC`,
    [userId, status || null, search ? likePattern(search) : null]
  );
  return rows;
}

/** First few members of each project (Manager first), for the avatar stack on cards. */
async function listMemberPreviews(projectIds, db = pool) {
  if (!projectIds.length) return [];
  const { rows } = await db.query(
    `SELECT m.project_id, u.id, u.name
       FROM project_members m JOIN users u ON u.id = m.user_id
      WHERE m.project_id = ANY($1::int[])
      ORDER BY m.project_id, (m.role = 'manager') DESC, m.joined_at, u.id`,
    [projectIds]
  );
  return rows;
}

async function findDetail(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT p.id, p.title, p.description, p.status, p.end_date, p.members_can_create_tasks,
            p.created_at, p.updated_at,
            ${TASK_TOTAL_SQL} AS task_total, ${TASK_DONE_SQL} AS task_done
       FROM projects p WHERE p.id = $1`,
    [projectId]
  );
  return rows[0] || null;
}

async function listMembers(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, m.role, m.joined_at
       FROM project_members m JOIN users u ON u.id = m.user_id
      WHERE m.project_id = $1
      ORDER BY (m.role = 'manager') DESC, m.joined_at, u.id`,
    [projectId]
  );
  return rows;
}

async function findMember(projectId, userId, db = pool) {
  const { rows } = await db.query(
    'SELECT user_id, role FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return rows[0] || null;
}

/** Names of all members, used for @mentions. */
async function listMemberNames(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT u.id AS "userId", u.name FROM project_members m JOIN users u ON u.id = m.user_id
      WHERE m.project_id = $1`,
    [projectId]
  );
  return rows;
}

/** FR-PROJ-01, FR-PROJ-02: creates the project and makes the creator its Manager. */
async function create({ title, description, status, endDate, ownerId }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO projects (title, description, status, end_date, owner_id)
     VALUES ($1, $2, COALESCE($3::text, 'active'), $4, $5) RETURNING id`,
    [title, description, status || null, endDate || null, ownerId]
  );
  const projectId = rows[0].id;
  await db.query("INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'manager')", [
    projectId,
    ownerId,
  ]);
  return projectId;
}

async function update(projectId, patch, db = pool) {
  const { sets, values } = buildSet(patch, {
    title: 'title',
    description: 'description',
    status: 'status',
    endDate: 'end_date',
    membersCanCreateTasks: 'members_can_create_tasks',
  });
  if (!sets.length) return;
  await db.query(
    `UPDATE projects SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length + 1}`,
    [...values, projectId]
  );
}

/** Cascades to members, tasks, comments and notifications (FR-PROJ-04, NFR-REL-01). */
async function remove(projectId, db = pool) {
  await db.query('DELETE FROM projects WHERE id = $1', [projectId]);
}

async function addMember(projectId, userId, db = pool) {
  await db.query("INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'member')", [
    projectId,
    userId,
  ]);
}

/** FR-PROJ-08: the member's tasks in this project become unassigned. Returns the task ids. */
async function removeMember(projectId, userId, db = pool) {
  const { rows } = await db.query(
    `UPDATE tasks SET assignee_id = NULL, updated_at = now()
      WHERE project_id = $1 AND assignee_id = $2 RETURNING id`,
    [projectId, userId]
  );
  await db.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
  return rows.map((r) => r.id);
}

/** Projects this user manages that still have other members (blocks account deletion). */
async function listManagedSharedProjects(userId, db = pool) {
  const { rows } = await db.query(
    `SELECT p.id, p.title
       FROM project_members pm JOIN projects p ON p.id = pm.project_id
      WHERE pm.user_id = $1 AND pm.role = 'manager'
        AND (SELECT COUNT(*) FROM project_members x WHERE x.project_id = pm.project_id) > 1
      ORDER BY p.title`,
    [userId]
  );
  return rows;
}

/** Deletes projects where this user is the only member. Returns the deleted ids. */
async function deleteSoleMemberProjects(userId, db = pool) {
  const { rows } = await db.query(
    `DELETE FROM projects
      WHERE id IN (
        SELECT pm.project_id FROM project_members pm
         WHERE pm.user_id = $1 AND pm.role = 'manager'
           AND (SELECT COUNT(*) FROM project_members x WHERE x.project_id = pm.project_id) = 1
      )
      RETURNING id`,
    [userId]
  );
  return rows.map((r) => r.id);
}

/** Admin list of every project (FR-USER-04). */
async function listAll(db = pool) {
  const { rows } = await db.query(
    `SELECT p.id, p.title, p.status, p.end_date, p.created_at,
            (SELECT u.name FROM project_members m JOIN users u ON u.id = m.user_id
              WHERE m.project_id = p.id AND m.role = 'manager') AS manager_name,
            ${MEMBER_COUNT_SQL} AS member_count, ${TASK_TOTAL_SQL} AS task_total, ${TASK_DONE_SQL} AS task_done
       FROM projects p ORDER BY p.created_at DESC, p.id DESC`
  );
  return rows;
}

// ---------- dashboard queries (FR-DASH-*) ----------
async function countTasksByStatus(projectId, db = pool) {
  const { rows } = await db.query(
    'SELECT status, COUNT(*)::int AS n FROM tasks WHERE project_id = $1 GROUP BY status',
    [projectId]
  );
  return rows;
}

async function countOverdue(projectId, today, db = pool) {
  const { rows } = await db.query(
    "SELECT COUNT(*) AS n FROM tasks WHERE project_id = $1 AND status <> 'done' AND due_date < $2",
    [projectId, today]
  );
  return rows[0].n;
}

async function memberStats(projectId, db = pool) {
  const { rows } = await db.query(
    `SELECT u.id, u.name, m.role,
            COUNT(t.id)::int AS assigned,
            (COUNT(t.id) FILTER (WHERE t.status = 'done'))::int AS completed
       FROM project_members m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN tasks t ON t.project_id = m.project_id AND t.assignee_id = u.id
      WHERE m.project_id = $1
      GROUP BY u.id, u.name, m.role
      ORDER BY u.name`,
    [projectId]
  );
  return rows;
}

/** Tasks completed per week (weeks start on Monday, in the given time zone). */
async function completedPerWeek(projectId, timeZone, db = pool) {
  const { rows } = await db.query(
    `SELECT date_trunc('week', completed_at AT TIME ZONE $2::text)::date AS week_start, COUNT(*)::int AS n
       FROM tasks
      WHERE project_id = $1 AND completed_at IS NOT NULL
        AND completed_at >= now() - interval '10 weeks'
      GROUP BY 1 ORDER BY 1`,
    [projectId, timeZone]
  );
  return rows;
}

// ---------- activity log (FR-RT-03) ----------
async function addActivity({ projectId, userId, action, target = '' }, db = pool) {
  await db.query(
    'INSERT INTO activity_logs (project_id, user_id, action, target) VALUES ($1, $2, $3, $4)',
    [projectId, userId, action, String(target).slice(0, 250)]
  );
}

async function listActivity(projectId, limit = 100, db = pool) {
  const { rows } = await db.query(
    `SELECT a.id, a.action, a.target, a.created_at, a.user_id, u.name AS user_name
       FROM activity_logs a LEFT JOIN users u ON u.id = a.user_id
      WHERE a.project_id = $1
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT $2`,
    [projectId, limit]
  );
  return rows;
}

module.exports = {
  PROJECT_COLUMNS,
  findWithRole,
  listProjectIdsForUser,
  listForUser,
  listMemberPreviews,
  findDetail,
  listMembers,
  findMember,
  listMemberNames,
  create,
  update,
  remove,
  addMember,
  removeMember,
  listManagedSharedProjects,
  deleteSoleMemberProjects,
  listAll,
  countTasksByStatus,
  countOverdue,
  memberStats,
  completedPerWeek,
  addActivity,
  listActivity,
};
