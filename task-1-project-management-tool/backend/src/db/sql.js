'use strict';

/**
 * Builds the SET part of an UPDATE from a patch object.
 * `columns` maps patch keys (camelCase) to column names (snake_case); only keys
 * that are present in the patch are used, so column names never come from user input.
 */
function buildSet(patch, columns, startIndex = 1) {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(columns)) {
    if (Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined) {
      values.push(patch[key]);
      sets.push(`${column} = $${startIndex + values.length - 1}`);
    }
  }
  return { sets, values };
}

/** Escapes % _ \ for use inside an ILIKE pattern. */
function likePattern(text) {
  return `%${String(text).replace(/[\\%_]/g, '\\$&')}%`;
}

module.exports = { buildSet, likePattern };
