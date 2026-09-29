import express from 'express';
import { registerCounterMutationRoutes } from './counter-mutation.js';

export function createApp(database) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.get('/api/health', async (_req, res) => {
    try {
      await database.query({ sql: 'SELECT 1', timeout: 2000 });
      res.json({ status: 'ok', database: 'connected' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unavailable' });
    }
  });

  registerCounterMutationRoutes(app, database);

  // TODO: Implement the counter read route in the query API card.

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
