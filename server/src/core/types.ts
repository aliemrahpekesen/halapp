export type Role = 'SuperAdmin' | 'Admin' | 'Muhasebe' | 'Tahsilatci' | 'ReadOnly';
export const ROLES: Role[] = ['SuperAdmin', 'Admin', 'Muhasebe', 'Tahsilatci', 'ReadOnly'];

export interface RequestCtx {
  tenantId: string;
  userId: string;
  userEmail: string;
  role: Role;
}

export type Action = 'read' | 'write' | 'delete';

declare module 'fastify' {
  interface FastifyRequest {
    ctx: RequestCtx;
  }
}
