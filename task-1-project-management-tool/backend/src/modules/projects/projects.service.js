'use strict';

const env = require('../../config/env');
const { withTransaction } = require('../../db/pool');
const { badRequest, conflict, notFound } = require('../../utils/httpError');
const { addDays, mondayOf, todayIn } = require('../../utils/date');
const { progressPercent, taskCounts } = require('../../utils/progress');
const { TASK_STATUSES } = require('../../constants');
const realtime = require('../../realtime/socket');
const usersRepo = require('../users/users.repository');
const notifications = require('../notifications/notifications.service');
const repo = require('./projects.repository');

/** Activity log is a "Could" feature: a logging failure must never break the real action. */
async function logActivity(entry) {
  try {
    await repo.addActivity(entry);
  } catch (err) {
    console.error('Could not write activity log', err);
  }
}

function toSummary(row, previews) {
  const members = (previews.get(row.id) || []).slice(0, 3).map((m) => ({ id: m.id, name: m.name }));
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    endDate: row.end_date,
    myRole: row.my_role,
    counts: taskCounts(row.task_done, row.task_total),
    progress: progressPercent(row.task_done, row.task_total),
    memberCount: row.member_count,
    members,
    createdAt: row.created_at,
  };
}

/** FR-PROJ-05, FR-PROJ-10, FR-PROJ-12 */
async function listProjects(user, query) {
  const rows = await repo.listForUser(user.id, query);
  const previewRows = await repo.listMemberPreviews(rows.map((r) => r.id));
  const previews = new Map();
  for (const p of previewRows) {
    if (!previews.has(p.project_id)) previews.set(p.project_id, []);
    previews.get(p.project_id).push(p);
  }
  return { projects: rows.map((row) => toSummary(row, previews)) };
}

/** Project detail for the board header, settings page and member list. */
async function getProject(projectId, role) {
  const [row, members] = await Promise.all([repo.findDetail(projectId), repo.listMembers(projectId)]);
  if (!row) throw notFound('Project not found', 'PROJECT_NOT_FOUND');
  const isManager = role === 'manager';
  return {
    project: {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      endDate: row.end_date,
      membersCanCreateTasks: row.members_can_create_tasks,
      myRole: role,
      counts: taskCounts(row.task_done, row.task_total),
      progress: progressPercent(row.task_done, row.task_total),
      createdAt: row.created_at,
      members: members.map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
        // Email addresses are shown to the Manager only (settings page).
        ...(isManager ? { email: m.email } : {}),
      })),
    },
  };
}

/** FR-PROJ-01, FR-PROJ-02 */
async function createProject(user, input) {
  const projectId = await withTransaction((client) =>
    repo.create({ ...input, ownerId: user.id }, client)
  );
  await logActivity({ projectId, userId: user.id, action: 'project.created', target: input.title });
  return getProject(projectId, 'manager');
}

/** FR-PROJ-03, FR-PROJ-09, FR-PROJ-11 */
async function updateProject(user, project, patch) {
  await repo.update(project.id, patch);
  realtime.toProject(project.id, 'project:updated', { projectId: project.id, actorId: user.id });
  await logActivity({
    projectId: project.id,
    userId: user.id,
    action: 'project.updated',
    target: patch.title || project.title,
  });
  return getProject(project.id, 'manager');
}

/** FR-PROJ-04 */
async function deleteProject(user, project) {
  await repo.remove(project.id);
  realtime.toProject(project.id, 'project:deleted', { projectId: project.id, actorId: user.id });
  realtime.closeProject(project.id);
}

/** FR-PROJ-07, FR-NOTIF-05 */
async function addMember(actor, project, { email }) {
  const user = await usersRepo.findByEmail(email);
  if (!user) {
    throw notFound('No registered user has this email address', 'USER_NOT_FOUND');
  }
  if (await repo.findMember(project.id, user.id)) {
    throw conflict('This user is already a member of the project', undefined, 'ALREADY_MEMBER');
  }

  const created = await withTransaction(async (client) => {
    await repo.addMember(project.id, user.id, client);
    return notifications.createMany(
      [
        {
          userId: user.id,
          type: 'added_to_project',
          projectId: project.id,
          message: notifications.messages.addedToProject(actor.name, project.title),
          actorId: actor.id,
        },
      ],
      client
    );
  });

  realtime.joinUserToProject(user.id, project.id);
  realtime.toProject(project.id, 'member:added', {
    projectId: project.id,
    member: { id: user.id, name: user.name, role: 'member' },
    actorId: actor.id,
  });
  notifications.publish(created);
  await logActivity({ projectId: project.id, userId: actor.id, action: 'member.added', target: user.name });

  return { member: { id: user.id, name: user.name, email: user.email, role: 'member' } };
}

/** FR-PROJ-08: the Manager can never be removed, so a project always has a Manager. */
async function removeMember(actor, project, targetUserId) {
  const member = await repo.findMember(project.id, targetUserId);
  if (!member) throw notFound('This user is not a member of the project', 'MEMBER_NOT_FOUND');
  if (member.role === 'manager') {
    throw badRequest('The project Manager cannot be removed', undefined, 'CANNOT_REMOVE_MANAGER');
  }

  const target = await usersRepo.findById(targetUserId);
  const unassignedTaskIds = await withTransaction((client) =>
    repo.removeMember(project.id, targetUserId, client)
  );

  // Tell everyone (including the removed user) first, then take the user out of the room.
  realtime.toProject(project.id, 'member:removed', {
    projectId: project.id,
    userId: targetUserId,
    unassignedTaskIds,
    actorId: actor.id,
  });
  realtime.removeUserFromProject(targetUserId, project.id);
  await logActivity({
    projectId: project.id,
    userId: actor.id,
    action: 'member.removed',
    target: target ? target.name : `user ${targetUserId}`,
  });
}

/** FR-DASH-01..05 */
async function getDashboard(project, role) {
  const today = todayIn(env.timezone);
  const [statusRows, overdue, weeklyRows, stats] = await Promise.all([
    repo.countTasksByStatus(project.id),
    repo.countOverdue(project.id, today),
    repo.completedPerWeek(project.id, env.timezone),
    role === 'manager' ? repo.memberStats(project.id) : Promise.resolve(null),
  ]);

  const byStatus = Object.fromEntries(TASK_STATUSES.map((s) => [s, 0]));
  for (const r of statusRows) byStatus[r.status] = r.n;
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);

  // Last 8 weeks, oldest first, with zeros for weeks that had no completed tasks.
  const completedByWeek = new Map(weeklyRows.map((r) => [r.week_start, r.n]));
  const firstWeek = addDays(mondayOf(today), -7 * 7);
  const weekly = Array.from({ length: 8 }, (_, i) => {
    const weekStart = addDays(firstWeek, i * 7);
    return { weekStart, completed: completedByWeek.get(weekStart) || 0 };
  });

  return {
    dashboard: {
      counts: taskCounts(byStatus.done, total),
      progress: progressPercent(byStatus.done, total),
      byStatus,
      overdue,
      weekly,
      ...(stats
        ? { memberStats: stats.map((s) => ({ id: s.id, name: s.name, role: s.role, assigned: s.assigned, completed: s.completed })) }
        : {}),
    },
  };
}

/** FR-RT-03 */
async function getActivity(project) {
  const rows = await repo.listActivity(project.id);
  return {
    activity: rows.map((r) => ({
      id: r.id,
      action: r.action,
      target: r.target,
      createdAt: r.created_at,
      user: r.user_id ? { id: r.user_id, name: r.user_name } : null,
    })),
  };
}

module.exports = {
  logActivity,
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  getDashboard,
  getActivity,
};
