'use strict';

/** Never includes password_hash (FR-AUTH-05). */
function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    systemRole: row.system_role,
    createdAt: row.created_at,
  };
}

module.exports = { toPublicUser };
