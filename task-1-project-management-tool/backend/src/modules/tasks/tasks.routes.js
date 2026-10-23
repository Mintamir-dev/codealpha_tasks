'use strict';

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { loadProject, loadTask, requireManager } = require('../../middleware/projectAccess');
const schemas = require('../../validation/schemas');
const ctrl = require('./tasks.controller');

const { projectIdParams, taskIdParams } = schemas.params;

/** Mounted at /api/projects/:projectId/tasks */
const projectTasksRouter = express.Router({ mergeParams: true });
projectTasksRouter.use(authenticate);
projectTasksRouter.get(
  '/',
  validate({ params: projectIdParams, query: schemas.tasks.taskListQuery }),
  loadProject,
  asyncHandler(ctrl.list)
);
projectTasksRouter.post(
  '/',
  validate({ params: projectIdParams, body: schemas.tasks.taskCreate }),
  loadProject,
  asyncHandler(ctrl.create) // permission (Manager, or Member when enabled) is checked in the service
);

/** Mounted at /api/tasks */
const taskRouter = express.Router();
taskRouter.use(authenticate);
taskRouter.get('/:taskId', validate({ params: taskIdParams }), loadTask, asyncHandler(ctrl.get));
taskRouter.patch(
  '/:taskId',
  validate({ params: taskIdParams, body: schemas.tasks.taskUpdate }),
  loadTask,
  requireManager,
  asyncHandler(ctrl.update)
);
taskRouter.patch(
  '/:taskId/status',
  validate({ params: taskIdParams, body: schemas.tasks.taskStatusChange }),
  loadTask,
  asyncHandler(ctrl.changeStatus)
);
taskRouter.delete('/:taskId', validate({ params: taskIdParams }), loadTask, requireManager, asyncHandler(ctrl.remove));

module.exports = { projectTasksRouter, taskRouter };
