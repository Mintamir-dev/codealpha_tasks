'use strict';

const express = require('express');
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const schemas = require('../../validation/schemas');
const ctrl = require('./users.controller');

const router = express.Router();
router.use(authenticate);

router.get('/me', asyncHandler(ctrl.getMe));
router.patch('/me', validate({ body: schemas.users.updateProfile }), asyncHandler(ctrl.updateMe));
router.put('/me/password', validate({ body: schemas.users.changePassword }), asyncHandler(ctrl.changePassword));
// DELETE carries the password in a JSON body, so clients must send Content-Type: application/json.
router.delete('/me', validate({ body: schemas.users.deleteAccount }), asyncHandler(ctrl.deleteMe));

// Admin area (view only), mounted at /api/admin
const adminRouter = express.Router();
adminRouter.use(authenticate, requireAdmin);
adminRouter.get('/users', asyncHandler(ctrl.adminUsers));
adminRouter.get('/projects', asyncHandler(ctrl.adminProjects));

module.exports = { router, adminRouter };
