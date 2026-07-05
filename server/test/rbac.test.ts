import { describe, it, expect } from 'vitest';
import { can } from '../src/core/rbac.js';

describe('Foundation: RBAC matrix', () => {
  it('SuperAdmin can do everything', () => {
    expect(can('SuperAdmin', 'finans', 'delete')).toBe(true);
    expect(can('SuperAdmin', 'tenant', 'write')).toBe(true);
  });

  it('Admin can manage tenant data but not tenant administration', () => {
    expect(can('Admin', 'satis', 'delete')).toBe(true);
    expect(can('Admin', 'tenant', 'write')).toBe(false);
  });

  it('ReadOnly can only read', () => {
    expect(can('ReadOnly', 'satis', 'read')).toBe(true);
    expect(can('ReadOnly', 'satis', 'write')).toBe(false);
    expect(can('ReadOnly', 'finans', 'delete')).toBe(false);
  });

  it('Tahsilatci can write collections but not delete sales', () => {
    expect(can('Tahsilatci', 'finans', 'write')).toBe(true);
    expect(can('Tahsilatci', 'satis', 'write')).toBe(false);
  });

  it('Muhasebe cannot administer users', () => {
    expect(can('Muhasebe', 'yonetim', 'write')).toBe(false);
    expect(can('Muhasebe', 'finans', 'delete')).toBe(true);
  });
});
