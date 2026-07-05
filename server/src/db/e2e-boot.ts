import fs from 'node:fs';
import path from 'node:path';
import { seed } from './seed.js';
import { buildApp } from '../app.js';

// Reset the e2e database for a clean run.
const file = process.env.DB_FILE || path.resolve(process.cwd(), 'data/e2e.sqlite');
for (const f of [file, `${file}-wal`, `${file}-shm`, `${file}-journal`]) {
  if (fs.existsSync(f)) fs.rmSync(f);
}

await seed();
const app = await buildApp();
await app.listen({ port: Number(process.env.PORT || 3001), host: '0.0.0.0' });
console.log('E2E server ready with seeded demo data');
