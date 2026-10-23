'use strict';

/** FR-DASH-02: Done / total as a whole percentage. Blocked counts as not done; no tasks => 0. */
function progressPercent(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function taskCounts(done, total) {
  return { total, done, remaining: total - done };
}

module.exports = { progressPercent, taskCounts };
