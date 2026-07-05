import type { FastifyInstance } from 'fastify';
import { registerParams } from './params.js';
import { registerSatis } from './satis.js';
import { registerCari } from './cari.js';
import { registerFinans } from './finans.js';
import { registerStok } from './stok.js';

export async function registerModules(app: FastifyInstance) {
  await registerParams(app);
  await registerSatis(app);
  await registerCari(app);
  await registerFinans(app);
  await registerStok(app);
  // Further modules (ebelge, odeme, rapor, yonetim) added here.
}
