/**
 * src/controllers/workspace.controller.ts
 * HTTP handlers for workspace CRUD.
 */
import { Request, Response } from 'express';
import { workspaceService } from '../services/workspace.service';
import { getClientContext } from '../utils/requestContext';
import { ok, created } from '../utils/apiResponse';
import { WORKSPACE_ROLE_PERMISSIONS } from '../config/workspacePermissions';

export const workspaceController = {
  async list(req: Request, res: Response) {
    const workspaces = await workspaceService.listForUser(req.user!.id);
    return ok(res, { workspaces }, 'OK');
  },

  async create(req: Request, res: Response) {
    const workspace = await workspaceService.create(req.user!.id, req.body, getClientContext(req));
    return created(res, { workspace }, 'Workspace created.');
  },

  async get(req: Request, res: Response) {
    const workspace = await workspaceService.getById(req.params.workspaceId, req.user!.id);
    return ok(res, { workspace }, 'OK');
  },

  async update(req: Request, res: Response) {
    const workspace = await workspaceService.update(
      req.params.workspaceId,
      req.user!.id,
      req.body,
      getClientContext(req),
    );
    return ok(res, { workspace }, 'Workspace updated.');
  },

  async remove(req: Request, res: Response) {
    await workspaceService.delete(req.params.workspaceId, req.user!.id, getClientContext(req));
    return ok(res, null, 'Workspace deleted.');
  },

  async getPermissions(req: Request, res: Response) {
    const role = req.workspaceMember!.role;
    return ok(
      res,
      { role, permissions: WORKSPACE_ROLE_PERMISSIONS[role] },
      'OK',
    );
  },
};
