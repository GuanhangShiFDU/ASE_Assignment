import { createApp } from './app.js';
import { pool } from './db.js';

const port = Number(process.env.PORT || 3000);
const server = createApp(pool).listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on port ${port}`);
});

function shutdown() {
  const timeout = setTimeout(() => process.exit(1), 10000);
  timeout.unref();
  server.close(async () => {
    await pool.end();
    clearTimeout(timeout);
    process.exit(0);
  });
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

