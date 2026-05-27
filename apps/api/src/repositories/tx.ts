import type { Queryable } from '../db/types.js';

export async function withTransaction<T>(db: Queryable, run: (tx: Queryable) => Promise<T>): Promise<T> {
  await db.query('BEGIN');
  try {
    const output = await run(db);
    await db.query('COMMIT');
    return output;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}
