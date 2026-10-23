'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const LoginLimiter = require('../src/utils/loginLimiter');

function makeLimiter() {
  const clock = { t: 1_000_000 };
  const limiter = new LoginLimiter({ max: 5, windowMs: 10 * 60 * 1000, now: () => clock.t });
  return { limiter, clock };
}

test('blocks after 5 failures within 10 minutes (NFR-SEC-08)', () => {
  const { limiter } = makeLimiter();
  for (let i = 0; i < 4; i++) limiter.recordFailure('a');
  assert.equal(limiter.isBlocked('a'), false);
  limiter.recordFailure('a');
  assert.equal(limiter.isBlocked('a'), true);
});

test('the block ends once the window has passed', () => {
  const { limiter, clock } = makeLimiter();
  for (let i = 0; i < 5; i++) limiter.recordFailure('a');
  clock.t += 10 * 60 * 1000 + 1;
  assert.equal(limiter.isBlocked('a'), false);
});

test('a successful log-in resets the counter', () => {
  const { limiter } = makeLimiter();
  for (let i = 0; i < 4; i++) limiter.recordFailure('a');
  limiter.reset('a');
  limiter.recordFailure('a');
  assert.equal(limiter.isBlocked('a'), false);
});

test('keys are independent', () => {
  const { limiter } = makeLimiter();
  for (let i = 0; i < 5; i++) limiter.recordFailure('a');
  assert.equal(limiter.isBlocked('b'), false);
});

test('sweep removes expired keys', () => {
  const { limiter, clock } = makeLimiter();
  limiter.recordFailure('a');
  clock.t += 11 * 60 * 1000;
  limiter.sweep();
  assert.equal(limiter.hits.size, 0);
});
