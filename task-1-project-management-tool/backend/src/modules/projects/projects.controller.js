'use strict';

const service = require('./projects.service');

exports.list = async (req, res) => {
  res.json(await service.listProjects(req.user, req.query));
};

exports.create = async (req, res) => {
  res.status(201).json(await service.createProject(req.user, req.body));
};

exports.get = async (req, res) => {
  res.json(await service.getProject(req.project.id, req.projectRole));
};

exports.update = async (req, res) => {
  res.json(await service.updateProject(req.user, req.project, req.body));
};

exports.remove = async (req, res) => {
  await service.deleteProject(req.user, req.project);
  res.status(204).end();
};

exports.addMember = async (req, res) => {
  res.status(201).json(await service.addMember(req.user, req.project, req.body));
};

exports.removeMember = async (req, res) => {
  await service.removeMember(req.user, req.project, req.params.userId);
  res.status(204).end();
};

exports.dashboard = async (req, res) => {
  res.json(await service.getDashboard(req.project, req.projectRole));
};

exports.activity = async (req, res) => {
  res.json(await service.getActivity(req.project));
};
