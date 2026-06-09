/**
 * src/controllers/user.controller.ts
 * Profile management + admin user operations.
 */
import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { getClientContext } from '../utils/requestContext';
import { ok } from '../utils/apiResponse';

export const userController = {
  async getProfile(req: Request, res: Response) {
    const user = await userService.getById(req.user!.id);
    return ok(res, { user }, 'OK');
  },

  async updateProfile(req: Request, res: Response) {
    const user = await userService.updateProfile(
      req.user!.id,
      req.body,
      getClientContext(req),
    );
    return ok(res, { user }, 'Profile updated.');
  },

  // ----------------------------- ADMIN ------------------------------------

  async listUsers(req: Request, res: Response) {
    const { page, limit, search } = req.query as unknown as {
      page: number;
      limit: number;
      search?: string;
    };
    const result = await userService.list({ page, limit, search });
    return ok(res, result, 'OK');
  },

  async updateRole(req: Request, res: Response) {
    const user = await userService.updateRole(
      req.user!.id,
      req.params.id,
      req.body.role,
      getClientContext(req),
    );
    return ok(res, { user }, 'Role updated.');
  },

  async setActive(req: Request, res: Response) {
    const user = await userService.setActive(
      req.user!.id,
      req.params.id,
      req.body.isActive,
      getClientContext(req),
    );
    return ok(res, { user }, 'User status updated.');
  },
};
