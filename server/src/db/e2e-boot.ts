import { initDb } from './index.js';
import { seed } from './seed.js';
import { buildApp } from '../app.js';

// Initialize DB (PGlite in-memory unless DATABASE_URL is set), seed demo data, serve.
await initDb();
await seed();
const app = await buildApp();
await app.listen({ port: Number(process.env.PORT || 3001), host: '0.0.0.0' });
console.log('E2E/demo server ready with seeded demo data');
