'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { loadProject, requireManager } = require('../../middleware/projectAccess');
const schemas = require('../../validation/schemas');
const ctrl = require('./projects.controller');

const { projectIdParams, projectMemberParams } = schemas.params;

router.use(authenticate);

router.get('/', validate({ query: schemas.projects.projectListQuery }), asyncHandler(ctrl.list));
router.post('/', validate({ body: schemas.projects.projectCreate }), asyncHandler(ctrl.create));

router.get('/:projectId', validate({ params: projectIdParams }), loadProject, asyncHandler(ctrl.get));
router.patch(
  '/:projectId',
  validate({ params: projectIdParams, body: schemas.projects.projectUpdate }),
  loadProject,
  requireManager,
  asyncHandler(ctrl.update)
);
router.delete('/:projectId', validate({ params: projectIdParams }), loadProject, requireManager, asyncHandler(ctrl.remove));

router.post(
  '/:projectId/members',
  validate({ params: projectIdParams, body: schemas.projects.addMember }),
  loadProject,
  requireManager,
  asyncHandler(ctrl.addMember)
);
router.delete(
  '/:projectId/members/:userId',
  validate({ params: projectMemberParams }),
  loadProject,
  requireManager,
  asyncHandler(ctrl.removeMember)
);

router.get('/:projectId/dashboard', validate({ params: projectIdParams }), loadProject, asyncHandler(ctrl.dashboard));
router.get(
  '/:projectId/activity',
  validate({ params: projectIdParams }),
  loadProject,
  requireManager,
  asyncHandler(ctrl.activity)
);

module.exports = router;
