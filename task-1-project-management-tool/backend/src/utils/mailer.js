'use strict';

/**
 * Email is out of scope (SRS section 8). This placeholder only prints the
 * password-reset link to the server log, so FR-AUTH-07 can be tried in development.
 * Replace the body with a real provider (SMTP, SendGrid, ...) when one is chosen.
 */
async function sendPasswordReset({ to, name, link }) {
  console.log(`[mailer] Password reset for ${name} <${to}>: ${link}`);
}

module.exports = { sendPasswordReset };
