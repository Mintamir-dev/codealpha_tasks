'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { progressPercent, taskCounts } = require('../src/utils/progress');

test('progress matches the percentages shown in the front-end design', () => {
  assert.equal(progressPercent(2, 8), 25);
  assert.equal(progressPercent(8, 22), 36);
  assert.equal(progressPercent(3, 10), 30);
  assert.equal(progressPercent(5, 12), 42);
  assert.equal(progressPercent(2, 6), 33);
  assert.equal(progressPercent(18, 18), 100);
});

test('a project without tasks shows 0%', () => {
  assert.equal(progressPercent(0, 0), 0);
});

test('task counts: total, done, remaining', () => {
  assert.deepEqual(taskCounts(2, 8), { total: 8, done: 2, remaining: 6 });
});
