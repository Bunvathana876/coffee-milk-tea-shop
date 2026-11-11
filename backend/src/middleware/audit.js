import { dbQuery } from '../db/database.js';

/**
 * Strips password, token, or secret fields from any audit payload.
 */
function sanitizeAuditDetails(details) {
  if (!details || typeof details !== 'object') return {};
  const sanitized = { ...details };
  const sensitiveKeys = ['password', 'password_hash', 'token', 'jwt', 'secret', 'access_token'];
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export class SecurityAuditError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'SecurityAuditError';
    this.status = 500;
    this.cause = cause;
  }
}

/**
 * Logs a security-critical RBAC or account lifecycle event.
 * Enforces authoritative write: if the audit record cannot be written,
 * it throws so caller transactions roll back and unauthorized or un-audited
 * state modifications are strictly prevented.
 */
export async function logSecurityEvent({
  actor_id,
  actor_role,
  action,
  target_type,
  target_id = null,
  details = {},
  ip_address = null,
  queryClient = null,
}) {
  const cleanDetails = sanitizeAuditDetails(details);
  const detailsJson = JSON.stringify(cleanDetails);
  const queryExecutor = queryClient || dbQuery;

  try {
    await queryExecutor(`
      INSERT INTO security_audit_logs (actor_id, actor_role, action, target_type, target_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      Number(actor_id) || 0,
      String(actor_role || 'unknown'),
      String(action),
      String(target_type),
      target_id ? Number(target_id) : null,
      detailsJson,
      ip_address ? String(ip_address).slice(0, 100) : null,
    ]);
  } catch (err) {
    console.error(`[Security Audit Error]: Failed to record audit log for action "${action}":`, err.message);
    throw new SecurityAuditError(`Failed to persist security audit event for ${action}: ${err.message}`, err);
  }
}
