'use strict';

const bcrypt = require('bcryptjs');
const env = require('../../config/env');
const { withTransaction } = require('../../db/pool');
const { badRequest, conflict } = require('../../utils/httpError');
const { progressPercent } = require('../../utils/progress');
const realtime = require('../../realtime/socket');
const projectsRepo = require('../projects/projects.repository');
const usersRepo = require('./users.repository');
const { toPublicUser } = require('./users.mapper');

async function assertPassword(userId, password, field) {
  const hash = await usersRepo.getPasswordHash(userId);
  const ok = hash ? await bcrypt.compare(password, hash) : false;
  if (!ok) {
    throw badRequest('Password is incorrect', [{ field, message: 'Password is incorrect' }], 'INVALID_PASSWORD');
  }
}

async function getMe(userId) {
  return toPublicUser(await usersRepo.findById(userId));
}

/** FR-USER-01, FR-USER-02 */
async function updateProfile(userId, patch) {
  return toPublicUser(await usersRepo.updateProfile(userId, patch));
}

/** FR-USER-01: changing the password needs the current password. */
async function changePassword(userId, { currentPassword, newPassword }) {
  await assertPassword(userId, currentPassword, 'currentPassword');
  await usersRepo.setPasswordHash(userId, await bcrypt.hash(newPassword, env.bcryptCost));
}

/**
 * FR-USER-03 (decided in SRS v1.1): refused while the user is Manager of a project that has
 * other members. Otherwise projects where the user is the only member are deleted, the user
 * leaves other projects, tasks become unassigned, notifications are deleted and comments stay
 * as "Deleted user" - all of that follows from the foreign keys in schema.sql.
 */
async function deleteAccount(user, { password }) {
  await assertPassword(user.id, password, 'password');

  if (user.systemRole === 'admin' && (await usersRepo.countAdmins()) <= 1) {
    throw conflict('You are the only administrator, so this account cannot be deleted', undefined, 'LAST_ADMIN');
  }

  const shared = await projectsRepo.listManagedSharedProjects(user.id);
  if (shared.length) {
    throw conflict(
      'You are the Manager of projects that have other members. Delete those projects first.',
      { projects: shared },
      'MANAGES_SHARED_PROJECTS'
    );
  }

  const deletedProjectIds = await withTransaction(async (client) => {
    const ids = await projectsRepo.deleteSoleMemberProjects(user.id, client);
    await usersRepo.remove(user.id, client);
    return ids;
  });

  deletedProjectIds.forEach((projectId) => realtime.closeProject(projectId));
  realtime.disconnectUser(user.id);
}

/** FR-USER-04: admin lists (view only). */
async function adminListUsers() {
  const rows = await usersRepo.listWithProjectCounts();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    systemRole: r.system_role,
    projectCount: r.project_count,
    joinedAt: r.created_at,
  }));
}

async function adminListProjects() {
  const rows = await projectsRepo.listAll();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    endDate: r.end_date,
    managerName: r.manager_name,
    memberCount: r.member_count,
    counts: { total: r.task_total, done: r.task_done, remaining: r.task_total - r.task_done },
    progress: progressPercent(r.task_done, r.task_total),
    createdAt: r.created_at,
  }));
}

module.exports = { getMe, updateProfile, changePassword, deleteAccount, adminListUsers, adminListProjects };
