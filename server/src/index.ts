import { buildApp } from './app.js';
import { seed } from './db/seed.js';

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

// Local dev (embedded PGlite): make sure demo tenants exist. Idempotent, so
// running it on every boot is safe. Opt out with SEED_DEMO=0; against a real
// DATABASE_URL seeding stays an explicit `npm run seed`.
const autoSeed = !process.env.DATABASE_URL && process.env.SEED_DEMO !== '0';

buildApp()
  .then(async (app) => {
    if (autoSeed) await seed();
    return app.listen({ port, host });
  })
  .then(() => console.log(`HalBoxPro API listening on http://${host}:${port}`))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
