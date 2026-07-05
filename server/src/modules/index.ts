import type { FastifyInstance } from 'fastify';
import { registerParams } from './params.js';
import { registerSatis } from './satis.js';
import { registerCari } from './cari.js';
import { registerFinans } from './finans.js';

export async function registerModules(app: FastifyInstance) {
  await registerParams(app);
  await registerSatis(app);
  await registerCari(app);
  await registerFinans(app);
  // Further modules (stok, ebelge, odeme, rapor, yonetim) added here.
}
