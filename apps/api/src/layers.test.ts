import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createPgMemDb } from './db/pgmem.js';
import { runMigrations } from './db/migrations.js';
import { createRepositories } from './repositories/app-repositories.js';
import { createServices } from './services/index.js';
import { hashPassword } from './lib/auth.js';
import { createApp } from './app.js';
import { loadSupabaseConfig } from './lib/runtime-config.js';

const basePath = '/api/v1';
const authSecret = 'test-secret';

async function setupAll() {
  const db = createPgMemDb();
  await runMigrations(db);
  const repositories = createRepositories(db);
  const services = createServices({ db, authSecret, supabase: loadSupabaseConfig({} as NodeJS.ProcessEnv) });
  return { db, repositories, services };
}

test('repository layer exposes mapped staff lookup', async () => {
  const { db, repositories } = await setupAll();
  try {
    await db.query(
      `INSERT INTO staff (staff_id, name, contract_type, standard_hours, role, standard_rate, overtime_rate, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['repo01', 'Repo User', 'full_time', 38, 'staff', 30, 45, hashPassword('RepoPass123!')]
    );

    const staffPk = await repositories.staff.findPk('repo01');
    assert.equal(typeof staffPk, 'number');

    const rows = await repositories.staff.list();
    assert.equal(rows[0].staff_id, 'repo01');
  } finally {
    await db.close?.();
  }
});

test('service layer exception detection is deduplicated across repeated runs', async () => {
  const { db, services } = await setupAll();
  try {
    await db.query(
      `INSERT INTO staff (staff_id, name, contract_type, standard_hours, role, standard_rate, overtime_rate, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['staff10', 'Detect User', 'full_time', 38, 'staff', 30, 45, hashPassword('UserPass123!')]
    );

    const staffPk = (await db.query<{ id: number }>('SELECT id FROM staff WHERE staff_id = $1', ['staff10'])).rows[0].id;
    await db.query(
      `INSERT INTO time_events (staff_id, station_id, event_type, method_type, break_type, event_timestamp, reason, created_by)
       VALUES ($1, NULL, 'clock_in', 'card', NULL, '2026-04-20T08:00:00.000Z', NULL, 'system')`,
      [staffPk]
    );

    const first = await services.exception.detect({ actor: 'admin01', from: '2026-04-20', to: '2026-04-20' });
    const second = await services.exception.detect({ actor: 'admin01', from: '2026-04-20', to: '2026-04-20' });

    assert.equal(first.data.length >= 1, true);
    assert.equal(second.data.length, 0);
  } finally {
    await db.close?.();
  }
});

test('controller layer maps service not-found to existing API error shape', async () => {
  const db = createPgMemDb();
  await runMigrations(db);
  const app = createApp({
    db,
    basePath,
    authSecret,
    supabase: loadSupabaseConfig({} as NodeJS.ProcessEnv)
  });

  try {
    await db.query(
      `INSERT INTO staff (staff_id, name, contract_type, standard_hours, role, standard_rate, overtime_rate, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      ['admin01', 'Admin User', 'full_time', 38, 'admin', 45, 68, hashPassword('AdminPass123!')]
    );

    const login = await request(app)
      .post(`${basePath}/auth/login`)
      .send({ staffId: 'admin01', password: 'AdminPass123!' })
      .expect(200);

    const token = login.body.token as string;
    const response = await request(app)
      .patch(`${basePath}/staff/not-exist`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'new' })
      .expect(404);

    assert.equal(response.body.error, 'staff_not_found');
  } finally {
    await db.close?.();
  }
});
