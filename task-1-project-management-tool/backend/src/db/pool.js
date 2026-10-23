'use strict';

const { Pool, types } = require('pg');
const env = require('../config/env');

// DATE columns come back as 'YYYY-MM-DD' strings (no timezone surprises).
types.setTypeParser(1082, (value) => value);
// COUNT(*) and other BIGINT values come back as numbers.
types.setTypeParser(20, (value) => parseInt(value, 10));

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error', err);
});

/** Runs `fn(client)` inside a transaction; rolls back if it throws. */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('Rollback failed', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, withTransaction };
