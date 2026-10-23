'use strict';

const router = require('express').Router();
const asyncHandler = require('../../utils/asyncHandler');
const validate = require('../../middleware/validate');
const { authenticate } = require('../../middleware/auth');
const schemas = require('../../validation/schemas');
const ctrl = require('./auth.controller');

router.post('/register', validate({ body: schemas.auth.register }), asyncHandler(ctrl.register));
router.post('/login', validate({ body: schemas.auth.login }), asyncHandler(ctrl.login));
router.post('/logout', authenticate, ctrl.logout);
router.post('/forgot-password', validate({ body: schemas.auth.forgotPassword }), asyncHandler(ctrl.forgotPassword));
router.post('/reset-password', validate({ body: schemas.auth.resetPassword }), asyncHandler(ctrl.resetPassword));

module.exports = router;
