'use strict';

/**
 * npm run db:seed        -> creates the first administrator (ADMIN_* variables in .env)
 * npm run db:seed:demo   -> also creates the demo users and the "Final-year thesis" project
 *                           that appear in the front-end design (password for all: password123)
 */
const bcrypt = require('bcryptjs');
const env = require('../src/config/env');
const { pool, withTransaction } = require('../src/db/pool');

const DEMO_PASSWORD = 'password123';

async function ensureUser(client, { name, email, password, role = 'user', createdAt }) {
  const existing = await client.query('SELECT id FROM users WHERE lower(email) = lower($1)', [email]);
  if (existing.rows[0]) return { id: existing.rows[0].id, created: false };
  const hash = await bcrypt.hash(password, env.bcryptCost);
  const { rows } = await client.query(
    `INSERT INTO users (name, email, password_hash, system_role, created_at)
     VALUES ($1, lower($2), $3, $4, COALESCE($5::timestamptz, now())) RETURNING id`,
    [name, email, hash, role, createdAt || null]
  );
  return { id: rows[0].id, created: true };
}

async function seedAdmin(client) {
  const admin = await ensureUser(client, {
    name: process.env.ADMIN_NAME || 'Administrator',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: process.env.ADMIN_PASSWORD || 'ChangeMe123',
    role: 'admin',
  });
  console.log(admin.created ? 'Administrator created.' : 'Administrator already exists.');
}

async function seedDemo(client) {
  const exists = await client.query("SELECT 1 FROM projects WHERE title = 'Final-year thesis' LIMIT 1");
  if (exists.rows[0]) {
    console.log('Demo data already exists, skipping.');
    return;
  }

  const make = (name, email, createdAt) =>
    ensureUser(client, { name, email, password: DEMO_PASSWORD, createdAt }).then((u) => u.id);
  const hana = await make('Hana Tadesse', 'hana@example.com', '2026-09-12T09:00:00+03:00');
  const dawit = await make('Dawit Bekele', 'dawit@example.com', '2026-09-12T09:30:00+03:00');
  const selam = await make('Selam Mulugeta', 'selam@example.com', '2026-09-14T10:00:00+03:00');
  await make('Abel Kebede', 'abel@example.com', '2026-09-20T10:00:00+03:00');
  await make('Betty Girma', 'betty@example.com', '2026-10-02T10:00:00+03:00');

  // ----- Final-year thesis (Hana is the Manager) -----
  const { rows: p } = await client.query(
    `INSERT INTO projects (title, description, status, end_date, owner_id, created_at)
     VALUES ('Final-year thesis', 'Research, writing and review schedule for the group thesis.',
             'active', '2026-11-30', $1, '2026-09-28T09:00:00+03:00') RETURNING id`,
    [hana]
  );
  const thesis = p[0].id;
  for (const [userId, role] of [[hana, 'manager'], [dawit, 'member'], [selam, 'member']]) {
    await client.query('INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)', [thesis, userId, role]);
  }

  const tasks = [
    // title, status, priority, assignee, due, position, completedAt, blockedReason, description
    ['Draft methodology chapter', 'todo', 'high', selam, '2026-10-24', 1, null, null, ''],
    ['Collect survey responses', 'todo', 'medium', hana, '2026-10-28', 2, null, null, ''],
    ['Format bibliography', 'todo', 'low', null, null, 3, null, null, ''],
    [
      'Write literature review', 'in_progress', 'high', dawit, '2026-10-08', 1, null, null,
      'Summarise the main sources on student teamwork in higher education. Group them by theme, not by author. Keep the chapter under 15 pages and use the shared https://example.com/reference-list for citations.',
    ],
    ['Analyse interview data', 'in_progress', 'medium', hana, '2026-10-20', 2, null, null, ''],
    ['Choose thesis topic', 'done', 'low', hana, null, 1, '2026-10-02T12:00:00+03:00', null, ''],
    ['Submit proposal', 'done', 'high', selam, null, 2, '2026-10-05T12:00:00+03:00', null, ''],
    ['Get ethics approval', 'blocked', 'high', dawit, '2026-10-18', 1, null, 'Waiting for the committee reply', ''],
  ];
  const taskIds = {};
  for (const [title, status, priority, assignee, due, position, completedAt, reason, description] of tasks) {
    const { rows } = await client.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, assignee_id, due_date, position,
                          created_by, blocked_reason, completed_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'2026-09-28T10:00:00+03:00') RETURNING id`,
      [thesis, title, description, status, priority, assignee, due, position, hana, reason, completedAt]
    );
    taskIds[title] = rows[0].id;
  }

  const lit = taskIds['Write literature review'];
  const comments = [
    [lit, dawit, 'I have finished the first three sources. I will send the summary tonight.', '2026-10-06T14:20:00+03:00'],
    [lit, hana, 'Thanks. Please add the two interview papers too, and keep the chapter under 15 pages.', '2026-10-07T09:05:00+03:00'],
    [lit, selam, '@Dawit Bekele I can review the draft on Saturday if you share it by Friday.', '2026-10-08T18:40:00+03:00'],
  ];
  for (const [taskId, userId, text, at] of comments) {
    await client.query('INSERT INTO comments (task_id, user_id, text, created_at, updated_at) VALUES ($1,$2,$3,$4,$4)', [
      taskId, userId, text, at,
    ]);
  }

  // ----- Library survey: empty project, shows the "No tasks found" state -----
  const { rows: lib } = await client.query(
    `INSERT INTO projects (title, description, owner_id) VALUES ('Library survey',
       'Questions, interviews and results summary.', $1) RETURNING id`,
    [hana]
  );
  await client.query("INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'manager')", [lib[0].id, hana]);

  // ----- a few notifications for Hana -----
  const notes = [
    ['mention', taskIds['Draft methodology chapter'], thesis, 'Selam Mulugeta mentioned you in a comment on \u201CDraft methodology chapter\u201D', false, '12 minutes'],
    ['status_changed', taskIds['Get ethics approval'], thesis, 'Dawit Bekele changed \u201CGet ethics approval\u201D to Blocked', false, '2 hours'],
    ['comment', taskIds['Analyse interview data'], thesis, 'Dawit Bekele commented on \u201CAnalyse interview data\u201D', true, '2 days'],
  ];
  for (const [type, taskId, projectId, message, isRead, ago] of notes) {
    await client.query(
      `INSERT INTO notifications (user_id, type, task_id, project_id, message, is_read, created_at)
       VALUES ($1,$2,$3,$4,$5,$6, now() - $7::interval)`,
      [hana, type, taskId, projectId, message, isRead, ago]
    );
  }

  console.log('Demo data created. Log in as hana@example.com / password123');
}

(async () => {
  try {
    await withTransaction(async (client) => {
      await seedAdmin(client);
      if (process.argv.includes('--demo')) await seedDemo(client);
    });
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
