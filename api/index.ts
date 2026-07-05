// Vercel serverless entry — wraps the Fastify app (built to server/dist, ESM).
// Uses dynamic import() so this works whether Vercel compiles the entry to
// CommonJS or ESM. Serves the API and the built SPA. Uses PGlite (ephemeral,
// seeded on cold start) unless DATABASE_URL is set (then that Postgres).
import path from 'node:path';

let ready: Promise<any> | null = null;

async function init() {
  process.env.STATIC_DIR = process.env.STATIC_DIR || path.join(process.cwd(), 'client/dist');
  const { buildApp } = await import('../server/dist/app.js');
  const { seed } = await import('../server/dist/db/seed.js');
  const app = await buildApp();
  try {
    await seed(); // idempotent: no-op when demo tenants already exist
  } catch (e) {
    console.error('seed skipped:', (e as Error).message);
  }
  await app.ready();
  return app;
}

export default async function handler(req: any, res: any) {
  if (!ready) ready = init();
  const app = await ready;
  app.server.emit('request', req, res);
}
