'use strict';

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const env = require('../../config/env');
const { withTransaction } = require('../../db/pool');
const { badRequest, conflict, tooMany, unauthorized } = require('../../utils/httpError');
const LoginLimiter = require('../../utils/loginLimiter');
const mailer = require('../../utils/mailer');
const usersRepo = require('../users/users.repository');
const { toPublicUser } = require('../users/users.mapper');
const authRepo = require('./auth.repository');
const { signToken } = require('./token');

const limiter = new LoginLimiter({ max: env.loginMaxFailures, windowMs: env.loginWindowMs });
setInterval(() => limiter.sweep(), 5 * 60 * 1000).unref();

// Compared against when the email is unknown, so timing does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.bcryptCost);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const emailTaken = () =>
  conflict(
    'This email is already registered',
    [{ field: 'email', message: 'This email is already registered' }],
    'EMAIL_TAKEN'
  );

/** FR-AUTH-01, FR-AUTH-02, FR-AUTH-05 */
async function register({ name, email, password }) {
  if (await usersRepo.findByEmail(email)) throw emailTaken();
  const passwordHash = await bcrypt.hash(password, env.bcryptCost);
  try {
    const user = await usersRepo.create({ name, email, passwordHash });
    return { user: toPublicUser(user) };
  } catch (err) {
    // Two simultaneous registrations: the unique index lets only one win.
    if (err.code === '23505') throw emailTaken();
    throw err;
  }
}

/** FR-AUTH-03, NFR-SEC-08. Wrong password and unknown email give the same message. */
async function login({ email, password }, ip) {
  const key = `${ip}|${email}`;
  if (limiter.isBlocked(key)) throw tooMany('Too many failed log-in attempts. Try again later.');

  const user = await usersRepo.findByEmailWithHash(email);
  const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !passwordOk) {
    limiter.recordFailure(key);
    throw unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');
  }

  limiter.reset(key);
  return { token: signToken(user), user: toPublicUser(user) };
}

/** FR-AUTH-07 (Could): same answer whether or not the email exists. */
async function forgotPassword({ email }) {
  const user = await usersRepo.findByEmail(email);
  if (user) {
    try {
      const raw = crypto.randomBytes(32).toString('hex');
      await authRepo.replaceResetToken(user.id, sha256(raw), new Date(Date.now() + 30 * 60 * 1000));
      await mailer.sendPasswordReset({
        to: user.email,
        name: user.name,
        link: `${env.frontendUrl}/reset-password?token=${raw}`,
      });
    } catch (err) {
      console.error('Password reset failed', err);
    }
  }
  return { message: 'If this email is registered, a reset link has been sent.' };
}

async function resetPassword({ token, password }) {
  const record = await authRepo.findValidResetToken(sha256(token));
  if (!record) throw badRequest('This reset link is invalid or has expired', undefined, 'INVALID_RESET_TOKEN');
  const passwordHash = await bcrypt.hash(password, env.bcryptCost);
  await withTransaction(async (client) => {
    await usersRepo.setPasswordHash(record.user_id, passwordHash, client);
    await authRepo.markResetTokenUsed(record.id, client);
  });
  return { message: 'Your password was updated. You can log in now.' };
}

module.exports = { register, login, forgotPassword, resetPassword };
