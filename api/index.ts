// Vercel serverless entry — wraps the Fastify app (built to server/dist).
// Serves the API and the built SPA. Uses PGlite (ephemeral, seeded on cold
// start) unless DATABASE_URL is set, in which case it uses that Postgres.
import path from 'node:path';
import { buildApp } from '../server/dist/app.js';
import { seed } from '../server/dist/db/seed.js';

let ready: Promise<any> | null = null;

async function init() {
  // Locate the bundled SPA (included via vercel.json `includeFiles`).
  process.env.STATIC_DIR = process.env.STATIC_DIR || path.join(process.cwd(), 'client/dist');
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
