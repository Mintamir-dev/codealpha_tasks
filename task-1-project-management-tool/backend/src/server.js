'use strict';

const http = require('http');
const env = require('./config/env');
const app = require('./app');
const realtime = require('./realtime/socket');
const { pool } = require('./db/pool');

const server = http.createServer(app);
realtime.init(server);

server.listen(env.port, () => {
  console.log(`PM Tool API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await pool.end().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
