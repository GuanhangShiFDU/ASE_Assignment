import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { pool } from '../src/db.js';

if (process.env.DB_NAME !== 'counter_query_test' || process.env.QUERY_DISPOSABLE_TEST !== '1') {
  throw new Error('Run backend/scripts/verify-query.sh; this suite changes only disposable data.');
}
after(() => pool.end());
async function get(status, body) {
  const response = await fetch('http://127.0.0.1:3000/api/counter', { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), body);
}
test('query reads actual MySQL values without modifying or recreating records', async t => {
  for (const value of [0, 17, -8]) {
    await t.test(`repeated reads preserve ${value}`, async () => {
      await pool.execute('UPDATE counter SET value = ? WHERE id = 1', [value]);
      const [before] = await pool.query('SELECT * FROM counter');
      for (let i = 0; i < 3; i++) await get(200, { value });
      const [after] = await pool.query('SELECT * FROM counter');
      assert.deepEqual(after, before);
    });
  }
  await t.test('missing record returns a failure, never fake zero or initialization', async () => {
    await pool.query('DELETE FROM counter WHERE id = 1');
    await get(503, { error: 'COUNTER_NOT_INITIALIZED' });
    const [rows] = await pool.query('SELECT * FROM counter');
    assert.deepEqual(rows, []);
    await pool.query('INSERT INTO counter (id,value) VALUES (1,-8)');
  });
});
