'use strict';

const env = require('../../config/env');
const { withTransaction } = require('../../db/pool');
const { badRequest, forbidden } = require('../../utils/httpError');
const { todayIn, weekRange } = require('../../utils/date');
const { canChangeStatus, canCreateTask, canManageTasks } = require('../../utils/permissions');
const { STATUS_LABELS } = require('../../constants');
const realtime = require('../../realtime/socket');
const projectsRepo = require('../projects/projects.repository');
const projectsService = require('../projects/projects.service');
const notifications = require('../notifications/notifications.service');
const repo = require('./tasks.repository');
const { toTask } = require('./tasks.mapper');

const today = () => todayIn(env.timezone);

function emitTask(projectId, event, extra) {
  realtime.toProject(projectId, event, { projectId, ...extra });
}

/** FR-TASK-02: an assignee must belong to the task's project. */
async function assertAssigneeIsMember(projectId, assigneeId) {
  if (assigneeId == null) return;
  const member = await projectsRepo.findMember(projectId, assigneeId);
  if (!member) {
    throw badRequest(
      'The assignee must be a member of this project',
      [{ field: 'assigneeId', message: 'The assignee must be a member of this project' }],
      'ASSIGNEE_NOT_MEMBER'
    );
  }
}

function permissionsFor(role, task, userId) {
  return {
    canEdit: canManageTasks(role),
    canDelete: canManageTasks(role),
    canChangeStatus: canChangeStatus(role, task.assignee_id, userId),
  };
}

/** FR-TASK-07, FR-TASK-08, FR-TASK-13, FR-TASK-15, FR-SRCH-01..04 */
async function listTasks(user, project, query) {
  const now = today();
  const filters = { search: query.search, priority: query.priority, status: query.status, sort: query.sort };

  if (query.mine === 'true') filters.assignee = user.id;
  else if (query.assignee === 'me') filters.assignee = user.id;
  else if (query.assignee === 'none') filters.assignee = 'none';
  else if (query.assignee) filters.assignee = Number(query.assignee);

  if (query.due === 'today') {
    filters.dueFrom = now;
    filters.dueTo = now;
  } else if (query.due === 'week') {
    const { from, to } = weekRange(now);
    filters.dueFrom = from;
    filters.dueTo = to;
  }

  const rows = await repo.listByProject(project.id, filters);
  return { tasks: rows.map((row) => toTask(row, now)) };
}

/** FR-TASK-09: detail view plus what the caller may do with it. */
async function getTask(user, role, taskRow) {
  return { task: toTask(taskRow, today()), permissions: permissionsFor(role, taskRow, user.id) };
}

/** FR-TASK-01, FR-TASK-02, FR-TASK-17, FR-NOTIF-01 */
async function createTask(user, project, role, input) {
  if (!canCreateTask(role, project.membersCanCreateTasks)) {
    throw forbidden('You are not allowed to create tasks in this project', 'TASK_CREATE_FORBIDDEN');
  }
  if (input.assigneeId != null && !canManageTasks(role)) {
    throw forbidden('Only the Manager can assign tasks', 'ASSIGN_FORBIDDEN');
  }
  await assertAssigneeIsMember(project.id, input.assigneeId);

  const { row, created } = await withTransaction(async (client) => {
    const position = await repo.nextPosition(project.id, 'todo', client);
    const task = await repo.create(
      { ...input, projectId: project.id, position, createdBy: user.id },
      client
    );
    const items = [];
    if (task.assignee_id) {
      items.push({
        userId: task.assignee_id,
        type: 'assigned',
        taskId: task.id,
        projectId: project.id,
        message: notifications.messages.assigned(user.name, task.title),
        actorId: user.id,
      });
    }
    return { row: task, created: await notifications.createMany(items, client) };
  });

  const task = toTask(row, today());
  emitTask(project.id, 'task:created', { actorId: user.id, task });
  notifications.publish(created);
  await projectsService.logActivity({ projectId: project.id, userId: user.id, action: 'task.created', target: task.title });
  return { task };
}

/** FR-TASK-03, FR-TASK-10, FR-TASK-11, FR-NOTIF-01 (Manager only; checked in the route). */
async function updateTask(user, project, taskRow, patch) {
  if (patch.assigneeId !== undefined) await assertAssigneeIsMember(project.id, patch.assigneeId);

  const data = { ...patch };
  // A blocked reason only makes sense while the task is Blocked.
  if (taskRow.status !== 'blocked') delete data.blockedReason;

  const { row, created } = await withTransaction(async (client) => {
    const updated = await repo.update(taskRow.id, data, client);
    const items = [];
    if (updated.assignee_id && updated.assignee_id !== taskRow.assignee_id) {
      items.push({
        userId: updated.assignee_id,
        type: 'assigned',
        taskId: updated.id,
        projectId: project.id,
        message: notifications.messages.assigned(user.name, updated.title),
        actorId: user.id,
      });
    }
    return { row: updated, created: await notifications.createMany(items, client) };
  });

  const task = toTask(row, today());
  emitTask(project.id, 'task:updated', { actorId: user.id, task });
  notifications.publish(created);
  await projectsService.logActivity({ projectId: project.id, userId: user.id, action: 'task.updated', target: task.title });
  return { task };
}

/**
 * FR-TASK-05, FR-TASK-06, FR-TASK-12, FR-TASK-16, FR-TASK-18, FR-NOTIF-04.
 * Manager can move any task; an assignee can move their own task; everyone else gets 403.
 */
async function changeStatus(user, project, role, taskRow, { status, blockedReason, position }) {
  if (!canChangeStatus(role, taskRow.assignee_id, user.id)) {
    throw forbidden('Only the Manager or the assignee can change this task\u2019s status', 'STATUS_CHANGE_FORBIDDEN');
  }

  const unchanged =
    status === taskRow.status && position === undefined && (blockedReason === undefined || status !== 'blocked');
  if (unchanged) return { task: toTask(taskRow, today()) };

  const statusChanged = status !== taskRow.status;
  const { row, created } = await withTransaction(async (client) => {
    const updated = await repo.setStatus(taskRow, { status, blockedReason, position }, client);
    const items = [];
    if (statusChanged) {
      // Notify the assignee and the creator (not the person who made the change).
      const recipients = new Set([updated.assignee_id, updated.created_by].filter(Boolean));
      for (const userId of recipients) {
        items.push({
          userId,
          type: 'status_changed',
          taskId: updated.id,
          projectId: project.id,
          message: notifications.messages.statusChanged(user.name, updated.title, STATUS_LABELS[status]),
          actorId: user.id,
        });
      }
    }
    return { row: updated, created: await notifications.createMany(items, client) };
  });

  const task = toTask(row, today());
  emitTask(project.id, 'task:moved', { actorId: user.id, task, from: taskRow.status, to: status });
  notifications.publish(created);
  if (statusChanged) {
    await projectsService.logActivity({
      projectId: project.id,
      userId: user.id,
      action: 'task.status_changed',
      target: `${task.title} \u2192 ${STATUS_LABELS[status]}`,
    });
  }
  return { task };
}

/** FR-TASK-04: comments and notifications of the task are removed by the foreign keys. */
async function deleteTask(user, project, taskRow) {
  await repo.remove(taskRow.id);
  emitTask(project.id, 'task:deleted', { actorId: user.id, taskId: taskRow.id });
  await projectsService.logActivity({ projectId: project.id, userId: user.id, action: 'task.deleted', target: taskRow.title });
}

module.exports = { listTasks, getTask, createTask, updateTask, changeStatus, deleteTask };
