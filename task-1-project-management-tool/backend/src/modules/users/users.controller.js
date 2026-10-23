'use strict';

const usersService = require('./users.service');

exports.getMe = async (req, res) => {
  res.json({ user: await usersService.getMe(req.user.id) });
};

exports.updateMe = async (req, res) => {
  res.json({ user: await usersService.updateProfile(req.user.id, req.body) });
};

exports.changePassword = async (req, res) => {
  await usersService.changePassword(req.user.id, req.body);
  res.status(204).end();
};

exports.deleteMe = async (req, res) => {
  await usersService.deleteAccount(req.user, req.body);
  res.status(204).end();
};

exports.adminUsers = async (req, res) => {
  res.json({ users: await usersService.adminListUsers() });
};

exports.adminProjects = async (req, res) => {
  res.json({ projects: await usersService.adminListProjects() });
};
