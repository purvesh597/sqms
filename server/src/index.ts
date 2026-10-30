import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './prisma/client';

async function main() {
  await prisma.$connect();
  // WAL + busy timeout let concurrent reads proceed while a write transaction runs.
  await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
  const server = createApp().listen(env.port, () => {
    console.log(`SQMS API ready on http://localhost:${env.port}/api`);
  });
  const shutdown = async () => {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
