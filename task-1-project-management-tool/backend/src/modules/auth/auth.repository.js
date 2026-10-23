'use strict';

const { pool } = require('../../db/pool');

/** Keeps only one unused reset token per user. */
async function replaceResetToken(userId, tokenHash, expiresAt, db = pool) {
  await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL', [userId]);
  await db.query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );
}

async function findValidResetToken(tokenHash, db = pool) {
  const { rows } = await db.query(
    `SELECT id, user_id FROM password_reset_tokens
      WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
    [tokenHash]
  );
  return rows[0] || null;
}

async function markResetTokenUsed(id, db = pool) {
  await db.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [id]);
}

module.exports = { replaceResetToken, findValidResetToken, markResetTokenUsed };
