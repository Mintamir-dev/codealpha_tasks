'use strict';

const { Server } = require('socket.io');
const env = require('../config/env');
const { verifyToken } = require('../modules/auth/token');
const usersRepo = require('../modules/users/users.repository');
const projectsRepo = require('../modules/projects/projects.repository');

let io = null;

const projectRoom = (projectId) => `project:${projectId}`;
const userRoom = (userId) => `user:${userId}`;

/**
 * Section 5.3: the server accepts a connection only with a valid token, and a client is
 * placed only in the rooms of projects it belongs to. If WebSockets fail, the REST API
 * still works (NFR-REL-02), so every emit helper is a safe no-op when the server is off.
 */
function init(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.corsOrigin } });

  io.use(async (socket, next) => {
    try {
      const payload = verifyToken(socket.handshake.auth?.token || '');
      const user = await usersRepo.findById(Number(payload.sub));
      if (!user) return next(new Error('unauthorized'));
      socket.data.user = { id: user.id, name: user.name };
      return next();
    } catch (err) {
      return next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { id: userId } = socket.data.user;
    socket.join(userRoom(userId));
    try {
      const projectIds = await projectsRepo.listProjectIdsForUser(userId);
      projectIds.forEach((projectId) => socket.join(projectRoom(projectId)));
    } catch (err) {
      console.error('Could not join project rooms', err);
    }

    // Optional: lets a client ask to (re)join a room; membership is checked on the server.
    socket.on('project:join', async (projectId, ack) => {
      try {
        const row = await projectsRepo.findWithRole(Number(projectId), userId);
        if (row && row.my_role) {
          socket.join(projectRoom(row.id));
          if (typeof ack === 'function') ack({ ok: true });
        } else if (typeof ack === 'function') ack({ ok: false });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false });
      }
    });
  });

  return io;
}

function toProject(projectId, event, payload) {
  if (io) io.to(projectRoom(projectId)).emit(event, payload);
}

function toUser(userId, event, payload) {
  if (io) io.to(userRoom(userId)).emit(event, payload);
}

function joinUserToProject(userId, projectId) {
  if (io) io.in(userRoom(userId)).socketsJoin(projectRoom(projectId));
}

function removeUserFromProject(userId, projectId) {
  if (io) io.in(userRoom(userId)).socketsLeave(projectRoom(projectId));
}

function closeProject(projectId) {
  if (io) io.in(projectRoom(projectId)).socketsLeave(projectRoom(projectId));
}

function disconnectUser(userId) {
  if (io) io.in(userRoom(userId)).disconnectSockets(true);
}

module.exports = {
  init,
  toProject,
  toUser,
  joinUserToProject,
  removeUserFromProject,
  closeProject,
  disconnectUser,
};
