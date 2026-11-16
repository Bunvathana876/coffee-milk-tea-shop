// Log only application-owned diagnostics. Driver messages/details can contain
// credentials, SQL parameters, or customer data and must never be interpolated.
export class DatabaseDiagnosticError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'DatabaseDiagnosticError';
    this.code = code;
  }
}

export function databaseFailure(error, phase = 'query') {
  if (error instanceof DatabaseDiagnosticError) return error;
  const code = typeof error?.code === 'string' ? error.code : '';
  let category = 'DB_QUERY_FAILED';
  let detail = 'Database query failed. Inspect database availability and schema compatibility.';
  if (code.startsWith('28')) {
    category = 'DB_AUTHENTICATION_FAILED';
    detail = 'Database authentication failed. Check the configured database role and credential.';
  } else if (/^(ERR_TLS_|ERR_SSL_|CERT_|DEPTH_ZERO_SELF_SIGNED_CERT|SELF_SIGNED_CERT_IN_CHAIN|UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT)/.test(code)) {
    category = 'DB_TLS_FAILED';
    detail = 'Database TLS verification failed. Check the hostname and trusted CA certificates; keep certificate verification enabled.';
  } else if (code === '42501') {
    category = 'DB_PERMISSION_DENIED';
    detail = 'Database permission denied. Check role privileges for the required schema, tables, and sequences.';
  } else if (['42P01', '42703', '3F000', '3D000', '42883'].includes(code)) {
    category = 'DB_SCHEMA_MISMATCH';
    detail = 'Database schema mismatch. Confirm the database target and approved migration state.';
  } else if (phase === 'connection' || code.startsWith('08') || ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', '57P01', '57P03', '53300'].includes(code)) {
    category = 'DB_CONNECTION_FAILED';
    detail = 'Database connection failed. Check the endpoint, network, timeout, and database availability.';
  }
  const safeCode = /^(?:[0-9][A-Z0-9]{4}|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ENOTFOUND|EHOSTUNREACH)$/.test(code) ? ` SQLSTATE/code=${code}.` : '';
  return new DatabaseDiagnosticError(category, `${detail}${safeCode}`, { cause: error });
}

export function formatDatabaseFailure(error, phase = 'query') {
  const diagnostic = databaseFailure(error, phase);
  return `[${diagnostic.code}] ${diagnostic.message}`;
}
