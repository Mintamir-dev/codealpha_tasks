'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { forbidden, notFound } = require('../utils/httpError');
const projectsRepo = require('../modules/projects/projects.repository');
const tasksRepo = require('../modules/tasks/tasks.repository');

/**
 * Loads the project and the caller's role in it from the database (never from the token).
 * Unknown project => 404. Existing project but caller is not a member => 403 (FR-PROJ-06).
 * Sets req.project and req.projectRole ('manager' | 'member').
 */
async function resolveProject(req, projectId) {
  const row = await projectsRepo.findWithRole(projectId, req.user.id);
  if (!row) throw notFound('Project not found', 'PROJECT_NOT_FOUND');
  if (!row.my_role) throw forbidden('You are not a member of this project', 'NOT_A_MEMBER');
  req.project = {
    id: row.id,
    title: row.title,
    status: row.status,
    membersCanCreateTasks: row.members_can_create_tasks,
  };
  req.projectRole = row.my_role;
}

const loadProject = asyncHandler(async (req, res, next) => {
  await resolveProject(req, req.params.projectId);
  next();
});

/** For routes with :taskId - loads the task, then checks membership of its project. */
const loadTask = asyncHandler(async (req, res, next) => {
  const task = await tasksRepo.findById(req.params.taskId);
  if (!task) throw notFound('Task not found', 'TASK_NOT_FOUND');
  await resolveProject(req, task.project_id);
  req.task = task;
  next();
});

function requireManager(req, res, next) {
  if (req.projectRole !== 'manager') {
    return next(forbidden('Only the project Manager can do this', 'MANAGER_ONLY'));
  }
  return next();
}

module.exports = { loadProject, loadTask, requireManager };
