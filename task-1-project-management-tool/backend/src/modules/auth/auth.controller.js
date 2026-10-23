'use strict';

const authService = require('./auth.service');

exports.register = async (req, res) => {
  res.status(201).json(await authService.register(req.body));
};

exports.login = async (req, res) => {
  res.json(await authService.login(req.body, req.ip));
};

// FR-AUTH-04: tokens are stateless, so logging out means the client discards its token.
exports.logout = (req, res) => {
  res.status(204).end();
};

exports.forgotPassword = async (req, res) => {
  res.json(await authService.forgotPassword(req.body));
};

exports.resetPassword = async (req, res) => {
  res.json(await authService.resetPassword(req.body));
};
