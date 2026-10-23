'use strict';

const service = require('./notifications.service');

exports.list = async (req, res) => {
  res.json(await service.list(req.user.id, req.query));
};

exports.unreadCount = async (req, res) => {
  res.json(await service.unreadCount(req.user.id));
};

exports.markRead = async (req, res) => {
  await service.markRead(req.user.id, req.params.id);
  res.status(204).end();
};

exports.markAllRead = async (req, res) => {
  await service.markAllRead(req.user.id);
  res.status(204).end();
};
