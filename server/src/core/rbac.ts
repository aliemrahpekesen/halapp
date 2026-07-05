import type { Action, Role } from './types.js';
import { forbidden } from './errors.js';

/**
 * Default role→action capability. Page-level fine-tuning can be layered via the
 * `permissions` table (EPIC-9), but these defaults cover Phase-1 behavior.
 *
 * Page groups: 'params', 'cari', 'satis', 'finans', 'stok', 'ebelge', 'odeme',
 * 'rapor', 'yonetim', 'tenant', 'mobil'.
 */
const MATRIX: Record<Role, Partial<Record<string, Action[]>>> = {
  SuperAdmin: { '*': ['read', 'write', 'delete'] },
  Admin: {
    '*': ['read', 'write', 'delete'],
    tenant: [], // tenant management reserved to SuperAdmin
  },
  Muhasebe: {
    params: ['read', 'write'],
    cari: ['read', 'write'],
    satis: ['read', 'write', 'delete'],
    finans: ['read', 'write', 'delete'],
    stok: ['read', 'write'],
    ebelge: ['read', 'write'],
    odeme: ['read', 'write'],
    rapor: ['read'],
    yonetim: ['read'],
    mobil: ['read', 'write'],
  },
  Tahsilatci: {
    cari: ['read'],
    finans: ['read', 'write'], // tahsilat/tediye
    odeme: ['read', 'write'],
    rapor: ['read'],
    mobil: ['read', 'write'],
  },
  ReadOnly: {
    params: ['read'], cari: ['read'], satis: ['read'], finans: ['read'],
    stok: ['read'], ebelge: ['read'], odeme: ['read'], rapor: ['read'],
    yonetim: ['read'], mobil: ['read'],
  },
};

export function can(role: Role, page: string, action: Action): boolean {
  const m = MATRIX[role];
  if (!m) return false;
  const star = m['*'];
  if (star) {
    // '*' grants baseline; a page listed with a narrower list overrides it.
    if (page in m) return (m[page] as Action[]).includes(action);
    return star.includes(action);
  }
  const allowed = m[page];
  return !!allowed && allowed.includes(action);
}

export function assertCan(role: Role, page: string, action: Action): void {
  if (!can(role, page, action)) throw forbidden();
}
