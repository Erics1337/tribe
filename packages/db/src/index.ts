import pg from 'pg';
export const createPool = (url: string) =>
  new pg.Pool({
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });
export type DB = pg.Pool;
export type Tx = pg.PoolClient;
export async function transaction<T>(db: DB, work: (tx: Tx) => Promise<T>): Promise<T> {
  const tx = await db.connect();
  try {
    await tx.query('BEGIN');
    const value = await work(tx);
    await tx.query('COMMIT');
    return value;
  } catch (e) {
    await tx.query('ROLLBACK');
    throw e;
  } finally {
    tx.release();
  }
}
export * as schema from './schema.js';
