import test from 'node:test';
import assert from 'node:assert/strict';
import { developmentCredentialDefaults, validateProductionConfig } from '../src/config.js';

function validProductionEnv(overrides = {}) {
  return {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://127.0.0.1:1/isolated',
    JWT_SECRET: 'm7Qp4Vn8Rk2Ty6Wb9Hs3Ld5Fx7Zj1Ca0',
    ADMIN_INITIAL_EMAIL: 'startup-check@example.test',
    ADMIN_INITIAL_PASSWORD: 'OnlyForIsolatedStartup42!',
    CORS_ORIGINS: 'https://startup.example.test',
    ...overrides,
  };
}

test('valid explicit production configuration passes without exposing values', () => {
  assert.doesNotThrow(() => validateProductionConfig(validProductionEnv()));
});

test('missing production JWT secret is rejected before startup', () => {
  assert.throws(
    () => validateProductionConfig(validProductionEnv({ JWT_SECRET: '' })),
    /JWT_SECRET is required/,
  );
});

test('weak production JWT secret is rejected', () => {
  assert.throws(
    () => validateProductionConfig(validProductionEnv({ JWT_SECRET: 'change-me' })),
    /JWT_SECRET must be a unique secret/,
  );
});

test('explicit development credential defaults are rejected in production', () => {
  const env = validProductionEnv({
    JWT_SECRET: developmentCredentialDefaults.jwtSecret,
    ADMIN_INITIAL_EMAIL: developmentCredentialDefaults.adminInitialEmail,
    ADMIN_INITIAL_PASSWORD: developmentCredentialDefaults.adminInitialPassword,
  });
  assert.throws(() => validateProductionConfig(env), /JWT_SECRET must be a unique secret/);
  assert.throws(() => validateProductionConfig(env), /ADMIN_INITIAL_EMAIL/);
  assert.throws(() => validateProductionConfig(env), /ADMIN_INITIAL_PASSWORD/);
});

test('unsafe initial administrator credentials are rejected', () => {
  const env = validProductionEnv({
    ADMIN_INITIAL_EMAIL: 'admin@coffeeshop.com',
    ADMIN_INITIAL_PASSWORD: 'short',
  });
  assert.throws(() => validateProductionConfig(env), /ADMIN_INITIAL_EMAIL/);
  assert.throws(() => validateProductionConfig(env), /ADMIN_INITIAL_PASSWORD/);
});

test('required production database and CORS configuration cannot fall back to development values', () => {
  assert.throws(
    () => validateProductionConfig(validProductionEnv({ DATABASE_URL: '', CORS_ORIGINS: '*' })),
    /DATABASE_URL is required/,
  );
  assert.throws(
    () => validateProductionConfig(validProductionEnv({ CORS_ORIGINS: '*' })),
    /CORS_ORIGINS must not contain a wildcard/,
  );
});

test('local development keeps its existing configuration defaults', () => {
  assert.doesNotThrow(() => validateProductionConfig({ NODE_ENV: 'development' }));
});

test('production mode cannot opt into the isolated test database', () => {
  assert.throws(
    () => validateProductionConfig(validProductionEnv({ NODE_ENV: 'test', ENVIRONMENT: 'production' })),
    /NODE_ENV=test cannot be combined with production/,
  );
});
