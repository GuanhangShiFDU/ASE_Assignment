// Run only in the disposable project created by verify-mutation.sh.
import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { pool } from '../src/db.js';

if (process.env.MUTATION_DISPOSABLE_TEST !== '1' || process.env.DB_NAME !== 'counter_mutation_test') {
  throw new Error('Use bash backend/scripts/verify-mutation.sh; this suite changes test data.');
}
after(() => pool.end());

async function stored() {
  const [rows] = await pool.query('SELECT id, value FROM counter ORDER BY id');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, 1);
  return rows[0].value;
}

async function request(action, status = 200, error) {
  const response = await fetch(`http://127.0.0.1:3000/api/counter/${action}`, {
    method: 'POST', signal: AbortSignal.timeout(15000),
  });
  assert.equal(response.status, status);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json();
  if (status !== 200) assert.deepEqual(body, { error });
  else {
    assert.deepEqual(Object.keys(body), ['value']);
    assert.equal(Number.isInteger(body.value), true);
  }
  return body.value;
}

test('actual HTTP API and MySQL agree under sequential, concurrent and failed writes', async t => {
  await t.test('initialization, increment, decrement and negative values', async () => {
    assert.equal(await stored(), 0);
    for (const [action, expected] of [['increment', 1], ['decrement', 0], ['decrement', -1]]) {
      assert.equal(await request(action), expected);
      assert.equal(await stored(), expected);
    }
  });
  await t.test('20 increments and 10 decrements concurrently produce a net gain of 10', async () => {
    const before = await stored();
    const actions = Array.from({ length: 30 }, (_, i) => i % 3 === 0 ? 'decrement' : 'increment');
    await Promise.all(actions.map(action => request(action)));
    assert.equal(await stored(), before + 10);
  });
  await t.test('each concurrent increment returns its own saved value', async () => {
    const before = await stored();
    const results = await Promise.all(Array.from({ length: 20 }, () => request('increment')));
    assert.deepEqual(results.sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => before + i + 1));
    assert.equal(await stored(), before + 20);
  });
  await t.test('each concurrent decrement returns its own saved value', async () => {
    const before = await stored();
    const results = await Promise.all(Array.from({ length: 10 }, () => request('decrement')));
    assert.deepEqual(results.sort((a, b) => a - b), Array.from({ length: 10 }, (_, i) => before - 10 + i));
    assert.equal(await stored(), before - 10);
  });
  await t.test('overflow is a 409 without a database change', async () => {
    for (const [value, action] of [[2147483647, 'increment'], [-2147483648, 'decrement']]) {
      await pool.execute('UPDATE counter SET value = ? WHERE id = 1', [value]);
      await request(action, 409, 'COUNTER_OUT_OF_RANGE');
      assert.equal(await stored(), value);
    }
  });
  await t.test('missing row is a 503, with no automatic reset', async () => {
    await pool.query('DELETE FROM counter WHERE id = 1');
    await request('increment', 503, 'COUNTER_NOT_INITIALIZED');
    await request('decrement', 503, 'COUNTER_NOT_INITIALIZED');
    const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM counter');
    assert.equal(count, 0);
    await pool.query('INSERT INTO counter (id, value) VALUES (1, 5)');
  });
});
