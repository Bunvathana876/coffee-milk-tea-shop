import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const developmentCredentialDefaults = Object.freeze({
  jwtSecret: 'super-secret-coffee-jwt-key-change-in-production',
  adminInitialEmail: 'admin@coffeeshop.com',
  adminInitialPassword: 'admin123',
});

export function jwtExpiresInMinutes(value) {
  const match = /^(\d+)(m|h|d)$/.exec(value);
  if (!match) throw new Error('JWT_EXPIRES_IN must use minutes, hours, or days (for example 7d).');
  const minutes = Number(match[1]) * { m: 1, h: 60, d: 1440 }[match[2]];
  if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 43200) {
    throw new Error('JWT_EXPIRES_IN must be between 1 minute and 30 days.');
  }
  return minutes;
}

export const config = {
  port: parseInt(process.env.PORT || '8003', 10),
  environment: process.env.ENVIRONMENT || process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || developmentCredentialDefaults.jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  usdToKhrRate: parseFloat(process.env.USD_TO_KHR_RATE || '4100'),
  corsOrigins: (process.env.CORS_ORIGINS || '*')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),

  // PostgreSQL Connection Settings
  databaseUrl:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.PGUSER || 'postgres'}:${process.env.PGPASSWORD || 'postgres'}@${process.env.PGHOST || 'localhost'}:${process.env.PGPORT || 5432}/${process.env.PGDATABASE || 'coffee_shop'}`,

  adminInitialEmail:
    process.env.ADMIN_INITIAL_EMAIL || developmentCredentialDefaults.adminInitialEmail,
  adminInitialPassword:
    process.env.ADMIN_INITIAL_PASSWORD || developmentCredentialDefaults.adminInitialPassword,
  adminInitialName: process.env.ADMIN_INITIAL_NAME || 'Store Administrator',

  // Customization rules
  sizePriceModifiers: {
    Small: 0.0,
    Medium: 0.3,
    Large: 0.6,
  },
  toppingPrices: {
    'Brown Sugar Pearls': 0.5,
    'Cheese Foam': 0.6,
    'Coconut Jelly': 0.4,
    Pudding: 0.5,
  },
};

/** Check whether environment is staging or production. */
export function isProductionOrStaging(env = process.env) {
  const nodeEnv = (env.NODE_ENV || '').toLowerCase();
  const environment = (env.ENVIRONMENT || '').toLowerCase();
  return (
    nodeEnv === 'production' ||
    nodeEnv === 'staging' ||
    environment === 'production' ||
    environment === 'staging'
  );
}

/** Fail before connecting to the database or seeding accounts in production or staging. */
export function validateProductionConfig(env = process.env) {
  jwtExpiresInMinutes(env.JWT_EXPIRES_IN || '7d');
  if (env.PORT !== undefined && (!/^\d+$/.test(env.PORT) || Number(env.PORT) < 1 || Number(env.PORT) > 65535)) {
    throw new Error('Invalid PORT: expected an integer from 1 to 65535.');
  }
  for (const [name, minimum, maximum] of [
    ['DB_POOL_MAX', 1, 50],
    ['DB_CONNECTION_TIMEOUT_MS', 100, 60000],
    ['DB_IDLE_TIMEOUT_MS', 1000, 300000],
  ]) {
    if (env[name] !== undefined && (!/^\d+$/.test(env[name]) || Number(env[name]) < minimum || Number(env[name]) > maximum)) {
      throw new Error(`Invalid ${name}: expected an integer from ${minimum} to ${maximum}.`);
    }
  }
  if (env.USD_TO_KHR_RATE !== undefined && (!Number.isFinite(Number(env.USD_TO_KHR_RATE)) || Number(env.USD_TO_KHR_RATE) <= 0)) {
    throw new Error('Invalid USD_TO_KHR_RATE: expected a positive number.');
  }
  if (!isProductionOrStaging(env)) return;

  const errors = [];
  if (env.NODE_ENV === 'test') {
    errors.push('NODE_ENV=test cannot be combined with production or staging');
  }
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CORS_ORIGINS',
  ];
  for (const name of required) {
    if (typeof env[name] !== 'string' || !env[name].trim()) {
      errors.push(`${name} is required`);
    }
  }

  const jwtSecret = env.JWT_SECRET?.trim();
  if (
    jwtSecret &&
    (jwtSecret.length < 32 ||
      jwtSecret === developmentCredentialDefaults.jwtSecret ||
      /^(?:change.?me|replace.?me|default|example|development|test)/i.test(jwtSecret) ||
      /^(.)(\1)+$/.test(jwtSecret))
  ) {
    errors.push('JWT_SECRET must be a unique secret of at least 32 characters');
  }

  const adminEmail = env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
  if (
    adminEmail &&
    (adminEmail === developmentCredentialDefaults.adminInitialEmail.toLowerCase() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail))
  ) {
    errors.push('ADMIN_INITIAL_EMAIL must be a valid, non-default address');
  }

  const adminPassword = env.ADMIN_INITIAL_PASSWORD;
  if (
    adminPassword &&
    (adminPassword.length < 12 ||
      adminPassword === developmentCredentialDefaults.adminInitialPassword ||
      /^(?:password|admin|change.?me|replace.?me|default|example|test)/i.test(adminPassword))
  ) {
    errors.push('ADMIN_INITIAL_PASSWORD must be a unique password of at least 12 characters');
  }

  const databaseUrl = env.DATABASE_URL?.trim();
  if (databaseUrl) {
    try {
      const parsed = new URL(databaseUrl);
      if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname || parsed.pathname === '/') {
        throw new Error();
      }
      if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) && parsed.searchParams.get('sslmode') !== 'verify-full') {
        errors.push('Remote DATABASE_URL must use sslmode=verify-full');
      }
    } catch {
      errors.push('DATABASE_URL must be a valid PostgreSQL connection URL');
    }
  }

  const origins =
    env.CORS_ORIGINS?.split(',')
      .map(origin => origin.trim())
      .filter(Boolean) || [];
  if (origins.includes('*')) {
    errors.push('CORS_ORIGINS must not contain a wildcard');
  }
  for (const origin of origins.filter(value => value !== '*')) {
    try {
      const parsed = new URL(origin);
      if (
        parsed.protocol !== 'https:' ||
        parsed.origin !== origin ||
        parsed.username ||
        parsed.password
      )
        throw new Error();
    } catch {
      errors.push('CORS_ORIGINS must contain HTTPS origins without paths or credentials');
    }
  }

  if (errors.length > 0) {
    const isStaging = (env.ENVIRONMENT || env.NODE_ENV || '').toLowerCase() === 'staging';
    throw new Error(
      `Invalid ${isStaging ? 'staging' : 'production'} configuration: ${errors.join('; ')}.`,
    );
  }
}
