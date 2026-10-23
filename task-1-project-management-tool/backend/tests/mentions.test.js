'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { findMentionedUserIds } = require('../src/utils/mentions');

const members = [
  { userId: 1, name: 'Hana Tadesse' },
  { userId: 2, name: 'Dawit Bekele' },
  { userId: 3, name: 'Dawit' },
];

test('finds a member mentioned by full name', () => {
  const ids = findMentionedUserIds('@Dawit Bekele I can review the draft on Saturday.', members);
  assert.deepEqual(ids.sort(), [2, 3]); // "@Dawit" is also a prefix match for member 3
});

test('matching is case-insensitive', () => {
  assert.deepEqual(findMentionedUserIds('thanks @hana tadesse!', members), [1]);
});

test('a name must end at a word boundary', () => {
  assert.deepEqual(findMentionedUserIds('hello @Hana Tadesseer', members), []);
});

test('an email address is not a mention', () => {
  assert.deepEqual(findMentionedUserIds('write to x@Hana Tadesse.com', members), []);
});

test('works with Ethiopic names', () => {
  const am = [{ userId: 9, name: 'ሐና ታደሰ' }];
  assert.deepEqual(findMentionedUserIds('እባክህ @ሐና ታደሰ ተመልከቺው', am), [9]);
});

test('names with regular-expression characters do not break matching', () => {
  const odd = [{ userId: 4, name: 'A.B (Test)' }];
  assert.deepEqual(findMentionedUserIds('hi @A.B (Test)', odd), [4]);
  assert.deepEqual(findMentionedUserIds('hi @AxB (Test)', odd), []);
});
