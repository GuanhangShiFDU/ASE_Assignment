import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mutateCounter } from '../src/counter-mutation.js';

function fixture({ value = 0, fail, rollbackFails = false } = {}) {
  let staged = value;
  let stored = value;
  const calls = [];
  const connection = {
    async beginTransaction() { calls.push('begin'); },
    async execute(sql, args) {
      if (sql.startsWith('UPDATE')) {
        if (fail === 'write') throw new Error('write failed');
        staged += args[0];
        return [{ affectedRows: 1 }];
      }
      if (fail === 'readback' && !sql.endsWith('FOR UPDATE')) throw new Error('read failed');
      return [staged === null ? [] : [{ value: staged }]];
    },
    async commit() {
      calls.push('commit');
      if (fail === 'commit') throw new Error('commit failed');
      stored = staged;
    },
    async rollback() {
      calls.push('rollback');
      if (rollbackFails) throw new Error('rollback failed');
      staged = stored;
    },
    release() { calls.push('release'); },
    destroy() { calls.push('destroy'); },
  };
  return { database: { async getConnection() { return connection; } }, calls, stored: () => stored };
}

test('success is returned only after commit completes', async () => {
  const f = fixture();
  const connection = await f.database.getConnection();
  const commit = connection.commit.bind(connection);
  let allowCommit;
  let notifyReached;
  const reached = new Promise(resolve => { notifyReached = resolve; });
  const gate = new Promise(resolve => { allowCommit = resolve; });
  connection.commit = async () => { notifyReached(); await gate; await commit(); };
  let settled = false;
  const pending = mutateCounter(f.database, 1).then(value => { settled = true; return value; });
  await reached;
  assert.equal(settled, false);
  assert.equal(f.stored(), 0);
  allowCommit();
  assert.equal(await pending, 1);
  assert.equal(f.stored(), 1);
});

for (const fail of ['write', 'readback', 'commit']) {
  test(`${fail} failure rejects and rolls back without changing committed value`, async () => {
    const f = fixture({ value: 7, fail });
    await assert.rejects(mutateCounter(f.database, 1));
    assert.equal(f.stored(), 7);
    assert.deepEqual(f.calls.slice(-2), ['rollback', 'release']);
  });
}

test('rollback failure destroys the connection instead of reusing it', async () => {
  const f = fixture({ fail: 'write', rollbackFails: true });
  await assert.rejects(mutateCounter(f.database, 1), /write failed/);
  assert.deepEqual(f.calls, ['begin', 'rollback', 'destroy']);
});

test('missing initialization is not silently recreated', async () => {
  const f = fixture({ value: null });
  await assert.rejects(mutateCounter(f.database, 1), { code: 'COUNTER_NOT_INITIALIZED' });
  assert.equal(f.stored(), null);
});

test('signed INT boundaries reject overflow and preserve the value', async () => {
  for (const [value, delta] of [[2147483647, 1], [-2147483648, -1]]) {
    const f = fixture({ value });
    await assert.rejects(mutateCounter(f.database, delta), { code: 'COUNTER_OUT_OF_RANGE' });
    assert.equal(f.stored(), value);
  }
});

test('only a delta of exactly one in either direction is accepted', async () => {
  await assert.rejects(mutateCounter({}, 2), TypeError);
});
