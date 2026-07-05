import { initDb, ddlScript } from './index.js';

// With a DATABASE_URL set, this creates the schema on that Postgres.
// Without one, it prints the DDL (useful to apply on a managed Postgres).
if (process.env.DATABASE_URL) {
  await initDb();
  console.log('Schema applied to DATABASE_URL target.');
} else {
  console.log(ddlScript());
}
