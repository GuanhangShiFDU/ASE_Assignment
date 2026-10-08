export function registerCounterQueryRoute(app, database) {
  app.get('/api/counter', async (_req, res) => {
    try {
      const [rows] = await database.query({
        sql: 'SELECT value FROM counter WHERE id = 1', timeout: 2000,
      });
      if (rows.length !== 1) {
        res.status(503).json({ error: 'COUNTER_NOT_INITIALIZED' });
        return;
      }
      if (!Number.isInteger(rows[0].value)) throw new Error('Invalid stored counter');
      res.json({ value: rows[0].value });
    } catch {
      res.status(503).json({ error: 'COUNTER_READ_FAILED' });
    }
  });
}
