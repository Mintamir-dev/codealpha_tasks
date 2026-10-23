'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { todayIn, addDays, mondayOf, weekRange } = require('../src/utils/date');

test('todayIn uses the given time zone (Addis Ababa is UTC+3)', () => {
  const instant = new Date('2026-10-09T21:30:00Z'); // 00:30 on 10 Oct in Addis Ababa
  assert.equal(todayIn('Africa/Addis_Ababa', instant), '2026-10-10');
  assert.equal(todayIn('UTC', instant), '2026-10-09');
});

test('weeks run Monday to Sunday', () => {
  // 10 Oct 2026 is a Saturday
  assert.equal(mondayOf('2026-10-10'), '2026-10-05');
  assert.deepEqual(weekRange('2026-10-10'), { from: '2026-10-05', to: '2026-10-11' });
  assert.equal(mondayOf('2026-10-05'), '2026-10-05'); // a Monday stays itself
  assert.equal(mondayOf('2026-10-11'), '2026-10-05'); // a Sunday belongs to the week before
});

test('addDays crosses month and year ends', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});
