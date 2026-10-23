'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('../src/utils/permissions');

test('create task: Manager yes, Member only when enabled, never a non-member', () => {
  assert.equal(p.canCreateTask('manager', false), true);
  assert.equal(p.canCreateTask('member', false), false);
  assert.equal(p.canCreateTask('member', true), true);
  assert.equal(p.canCreateTask(null, true), false);
});

test('edit, assign and delete tasks: Manager only', () => {
  assert.equal(p.canManageTasks('manager'), true);
  assert.equal(p.canManageTasks('member'), false);
});

test('change status: Manager (any task) or the assignee (own task)', () => {
  assert.equal(p.canChangeStatus('manager', 5, 1), true);
  assert.equal(p.canChangeStatus('member', 7, 7), true);
  assert.equal(p.canChangeStatus('member', 7, 8), false);
  assert.equal(p.canChangeStatus('member', null, 8), false); // unassigned task
});

test('comments: author edits, author or Manager deletes', () => {
  assert.equal(p.canEditComment(3, 3), true);
  assert.equal(p.canEditComment(3, 4), false);
  assert.equal(p.canEditComment(null, 4), false); // "Deleted user" comment
  assert.equal(p.canDeleteComment(3, 3, 'member'), true);
  assert.equal(p.canDeleteComment(3, 4, 'member'), false);
  assert.equal(p.canDeleteComment(3, 4, 'manager'), true);
});
