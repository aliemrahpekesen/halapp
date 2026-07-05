import type { FastifyInstance } from 'fastify';
import { registerParams } from './params.js';

export async function registerModules(app: FastifyInstance) {
  await registerParams(app);
  // Further modules (cari-satis, finans, stok, ebelge, odeme, rapor, yonetim)
  // are registered here as they are implemented.
}
