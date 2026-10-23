'use strict';

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const { loadTask } = require('../../middleware/projectAccess');
const schemas = require('../../validation/schemas');
const ctrl = require('./comments.controller');

const { taskIdParams, taskCommentParams } = schemas.params;

/** Mounted at /api/tasks/:taskId/comments */
const router = express.Router({ mergeParams: true });
router.use(authenticate);

router.get('/', validate({ params: taskIdParams }), loadTask, asyncHandler(ctrl.list));
router.post(
  '/',
  validate({ params: taskIdParams, body: schemas.comments.commentBody }),
  loadTask,
  asyncHandler(ctrl.create)
);
router.patch(
  '/:commentId',
  validate({ params: taskCommentParams, body: schemas.comments.commentBody }),
  loadTask,
  asyncHandler(ctrl.edit)
);
router.delete('/:commentId', validate({ params: taskCommentParams }), loadTask, asyncHandler(ctrl.remove));

module.exports = router;
