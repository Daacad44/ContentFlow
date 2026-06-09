/**
 * src/types/express.d.ts
 * Augments Express's `Express.User` (and therefore `req.user`) with the fields
 * populated by the auth middleware. Augmenting `Express.User` keeps us
 * compatible with @types/passport, which types `req.user` as `Express.User`.
 */
import { Role } from '@prisma/client';
import { WorkspaceRole } from '@prisma/client';

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: Role;
      tokenVersion: number;
    }

    interface WorkspaceContext {
      id: string;
      name: string;
      slug: string;
      isActive: boolean;
    }

    interface WorkspaceMemberContext {
      id: string;
      role: WorkspaceRole;
      joinedAt: Date;
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    workspace?: Express.WorkspaceContext;
    workspaceMember?: Express.WorkspaceMemberContext;
  }
}

export {};
