'use strict';

const service = require('./comments.service');

exports.list = async (req, res) => {
  res.json(await service.listComments(req.user, req.projectRole, req.task));
};

exports.create = async (req, res) => {
  res.status(201).json(await service.createComment(req.user, req.project, req.projectRole, req.task, req.body));
};

exports.edit = async (req, res) => {
  res.json(
    await service.editComment(req.user, req.project, req.projectRole, req.task, req.params.commentId, req.body)
  );
};

exports.remove = async (req, res) => {
  await service.deleteComment(req.user, req.project, req.projectRole, req.task, req.params.commentId);
  res.status(204).end();
};
