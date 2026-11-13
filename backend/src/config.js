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

export const config = {
  port: parseInt(process.env.PORT || '8001', 10),
  environment: process.env.ENVIRONMENT || 'development',
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
  if (!isProductionOrStaging(env)) return;

  const errors = [];
  if (env.NODE_ENV === 'test') {
    errors.push('NODE_ENV=test cannot be combined with production or staging');
  }
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ADMIN_INITIAL_EMAIL',
    'ADMIN_INITIAL_PASSWORD',
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
  if (databaseUrl && !/^postgres(?:ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL must be a PostgreSQL connection URL');
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
