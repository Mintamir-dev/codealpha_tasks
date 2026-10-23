'use strict';

/** Today's date as 'YYYY-MM-DD' in the given IANA time zone. */
function todayIn(timeZone, now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Monday of the week that contains `dateStr` (weeks run Monday to Sunday). */
function mondayOf(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7; // Monday = 0
  return addDays(dateStr, -offset);
}

/** { from, to } for the current Monday-Sunday week. */
function weekRange(dateStr) {
  const from = mondayOf(dateStr);
  return { from, to: addDays(from, 6) };
}

module.exports = { todayIn, addDays, mondayOf, weekRange };
