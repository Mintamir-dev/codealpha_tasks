'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const schemas = require('../../validation/schemas');
const ctrl = require('./notifications.controller');

router.use(authenticate);

router.get('/', validate({ query: schemas.notifications.notificationListQuery }), asyncHandler(ctrl.list));
router.get('/unread-count', asyncHandler(ctrl.unreadCount));
router.patch('/read-all', asyncHandler(ctrl.markAllRead));
router.patch('/:id/read', validate({ params: schemas.params.notificationParams }), asyncHandler(ctrl.markRead));

module.exports = router;
