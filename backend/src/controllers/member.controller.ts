/**
 * src/controllers/member.controller.ts
 * HTTP handlers for workspace member management.
 */
import { Request, Response } from 'express';
import { memberService } from '../services/member.service';
import { getClientContext } from '../utils/requestContext';
import { ok } from '../utils/apiResponse';

export const memberController = {
  async list(req: Request, res: Response) {
    const members = await memberService.list(req.params.workspaceId);
    return ok(res, { members }, 'OK');
  },

  async updateRole(req: Request, res: Response) {
    const member = await memberService.updateRole(
      req.params.workspaceId,
      req.user!.id,
      req.params.memberId,
      req.body.role,
      getClientContext(req),
    );
    return ok(res, { member }, 'Member role updated.');
  },

  async remove(req: Request, res: Response) {
    await memberService.remove(
      req.params.workspaceId,
      req.user!.id,
      req.params.memberId,
      getClientContext(req),
    );
    return ok(res, null, 'Member removed.');
  },

  async leave(req: Request, res: Response) {
    await memberService.leave(req.params.workspaceId, req.user!.id, getClientContext(req));
    return ok(res, null, 'You have left the workspace.');
  },

  async transferOwnership(req: Request, res: Response) {
    const member = await memberService.transferOwnership(
      req.params.workspaceId,
      req.user!.id,
      req.body.memberId,
      getClientContext(req),
    );
    return ok(res, { member }, 'Ownership transferred.');
  },
};
