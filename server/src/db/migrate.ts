import { createDb } from './index.js';
import path from 'node:path';

const file = process.env.DB_FILE || path.resolve(process.cwd(), 'data/halboxpro.sqlite');
createDb(file);
console.log(`Migrated database at ${file}`);
