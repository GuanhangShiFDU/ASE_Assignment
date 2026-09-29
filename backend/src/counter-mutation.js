class CounterError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

export async function mutateCounter(database, delta) {
  if (delta !== 1 && delta !== -1) throw new TypeError('Delta must be 1 or -1');
  const connection = await database.getConnection();
  let reusable = true;
  try {
    await connection.beginTransaction();
    // Lock the shared row until COMMIT so each response belongs to its own write.
    const [rows] = await connection.execute('SELECT value FROM counter WHERE id = 1 FOR UPDATE');
    if (rows.length !== 1) throw new CounterError('COUNTER_NOT_INITIALIZED', 503);
    const next = rows[0].value + delta;
    if (next < -2147483648 || next > 2147483647) {
      throw new CounterError('COUNTER_OUT_OF_RANGE', 409);
    }
    await connection.execute('UPDATE counter SET value = value + ? WHERE id = 1', [delta]);
    const [[saved]] = await connection.execute('SELECT value FROM counter WHERE id = 1');
    await connection.commit();
    return saved.value;
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Never return an uncertain transaction to the pool.
      reusable = false;
      connection.destroy();
    }
    throw error;
  } finally {
    if (reusable) connection.release();
  }
}

export function registerCounterMutationRoutes(app, database) {
  for (const [action, delta] of [['increment', 1], ['decrement', -1]]) {
    app.post(`/api/counter/${action}`, async (_req, res) => {
      try {
        const value = await mutateCounter(database, delta);
        res.json({ value });
      } catch (error) {
        if (error instanceof CounterError) {
          res.status(error.status).json({ error: error.code });
        } else {
          // Keep credentials and SQL details out of public error responses.
          res.status(503).json({ error: 'COUNTER_WRITE_FAILED' });
        }
      }
    });
  }
}
