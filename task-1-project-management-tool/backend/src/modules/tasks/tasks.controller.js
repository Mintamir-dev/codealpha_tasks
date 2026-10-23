'use strict';

const service = require('./tasks.service');

exports.list = async (req, res) => {
  res.json(await service.listTasks(req.user, req.project, req.query));
};

exports.create = async (req, res) => {
  res.status(201).json(await service.createTask(req.user, req.project, req.projectRole, req.body));
};

exports.get = async (req, res) => {
  res.json(await service.getTask(req.user, req.projectRole, req.task));
};

exports.update = async (req, res) => {
  res.json(await service.updateTask(req.user, req.project, req.task, req.body));
};

exports.changeStatus = async (req, res) => {
  res.json(await service.changeStatus(req.user, req.project, req.projectRole, req.task, req.body));
};

exports.remove = async (req, res) => {
  await service.deleteTask(req.user, req.project, req.task);
  res.status(204).end();
};
