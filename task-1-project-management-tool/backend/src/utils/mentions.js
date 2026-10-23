'use strict';

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * FR-COMM-06: finds project members mentioned as "@Full Name" in a comment.
 * `members` is [{ userId, name }]. Matching is case-insensitive and the name must
 * end at a word boundary, so "@Dawit Bekele" does not match "@Dawit Bekeley".
 */
function findMentionedUserIds(text, members) {
  const found = new Set();
  // Longest names first so "Ann Lee" is tried before "Ann".
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  for (const member of sorted) {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}_])@${escapeRegExp(member.name)}(?![\\p{L}\\p{N}_])`,
      'iu'
    );
    if (pattern.test(text)) found.add(member.userId);
  }
  return [...found];
}

module.exports = { findMentionedUserIds };
