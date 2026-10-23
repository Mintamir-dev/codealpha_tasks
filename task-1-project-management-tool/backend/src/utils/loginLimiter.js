'use strict';

/**
 * NFR-SEC-08: limits repeated failed log-ins (default 5 failures in 10 minutes).
 * Kept in memory, which is fine for one server process. If the API is ever run on
 * several instances, move this to a shared store such as Redis.
 */
class LoginLimiter {
  constructor({ max = 5, windowMs = 10 * 60 * 1000, now = Date.now } = {}) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.hits = new Map();
  }

  _recent(key) {
    const cutoff = this.now() - this.windowMs;
    const recent = (this.hits.get(key) || []).filter((t) => t > cutoff);
    if (recent.length) this.hits.set(key, recent);
    else this.hits.delete(key);
    return recent;
  }

  isBlocked(key) {
    return this._recent(key).length >= this.max;
  }

  recordFailure(key) {
    const recent = this._recent(key);
    recent.push(this.now());
    this.hits.set(key, recent);
  }

  reset(key) {
    this.hits.delete(key);
  }

  /** Drops expired entries so the map cannot grow forever. */
  sweep() {
    for (const key of [...this.hits.keys()]) this._recent(key);
  }
}

module.exports = LoginLimiter;
