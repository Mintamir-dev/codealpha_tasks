'use strict';

const { pool } = require('../../db/pool');
const { buildSet } = require('../../db/sql');

const PUBLIC_COLUMNS = 'id, name, email, phone, system_role, created_at';

async function findById(id, db = pool) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function findByEmail(email, db = pool) {
  const { rows } = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM users WHERE lower(email) = lower($1)`, [email]);
  return rows[0] || null;
}

async function findByEmailWithHash(email, db = pool) {
  const { rows } = await db.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  return rows[0] || null;
}

async function getPasswordHash(id, db = pool) {
  const { rows } = await db.query('SELECT password_hash FROM users WHERE id = $1', [id]);
  return rows[0] ? rows[0].password_hash : null;
}

async function create({ name, email, passwordHash, systemRole = 'user' }, db = pool) {
  const { rows } = await db.query(
    `INSERT INTO users (name, email, password_hash, system_role)
     VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_COLUMNS}`,
    [name, email, passwordHash, systemRole]
  );
  return rows[0];
}

async function updateProfile(id, patch, db = pool) {
  const { sets, values } = buildSet(patch, { name: 'name', phone: 'phone' });
  if (!sets.length) return findById(id, db);
  const { rows } = await db.query(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length + 1} RETURNING ${PUBLIC_COLUMNS}`,
    [...values, id]
  );
  return rows[0];
}

async function setPasswordHash(id, passwordHash, db = pool) {
  await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
}

async function remove(id, db = pool) {
  await db.query('DELETE FROM users WHERE id = $1', [id]);
}

async function countAdmins(db = pool) {
  const { rows } = await db.query("SELECT COUNT(*) AS n FROM users WHERE system_role = 'admin'");
  return rows[0].n;
}

/** Admin list: no phone numbers, no password hashes. */
async function listWithProjectCounts(db = pool) {
  const { rows } = await db.query(
    `SELECT u.id, u.name, u.email, u.system_role, u.created_at,
            COUNT(pm.project_id)::int AS project_count
       FROM users u
       LEFT JOIN project_members pm ON pm.user_id = u.id
      GROUP BY u.id
      ORDER BY u.created_at, u.id`
  );
  return rows;
}

module.exports = {
  findById,
  findByEmail,
  findByEmailWithHash,
  getPasswordHash,
  create,
  updateProfile,
  setPasswordHash,
  remove,
  countAdmins,
  listWithProjectCounts,
};
