'use strict';

require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = required('JWT_SECRET');

if (nodeEnv === 'production' && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: required('DATABASE_URL'),
  databaseSsl: process.env.DATABASE_SSL === 'true',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  // NFR-SEC-01: cost factor of at least 10
  bcryptCost: Math.max(10, parseInt(process.env.BCRYPT_COST || '10', 10)),
  corsOrigin: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  timezone: process.env.APP_TIMEZONE || 'Africa/Addis_Ababa',
  loginMaxFailures: parseInt(process.env.LOGIN_MAX_FAILURES || '5', 10),
  loginWindowMs: parseInt(process.env.LOGIN_WINDOW_MINUTES || '10', 10) * 60 * 1000,
};

module.exports = env;
