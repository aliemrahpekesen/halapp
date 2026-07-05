import type { FastifyInstance } from 'fastify';
import { registerParams } from './params.js';
import { registerSatis } from './satis.js';
import { registerCari } from './cari.js';
import { registerFinans } from './finans.js';
import { registerStok } from './stok.js';
import { registerEbelge } from './ebelge.js';
import { registerOdeme } from './odeme.js';

export async function registerModules(app: FastifyInstance) {
  await registerParams(app);
  await registerSatis(app);
  await registerCari(app);
  await registerFinans(app);
  await registerStok(app);
  await registerEbelge(app);
  await registerOdeme(app);
  // Further modules (rapor, yonetim) added here.
}
