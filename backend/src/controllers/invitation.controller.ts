/**
 * src/controllers/invitation.controller.ts
 * HTTP handlers for workspace invitations.
 */
import { Request, Response } from 'express';
import { invitationService } from '../services/invitation.service';
import { getClientContext } from '../utils/requestContext';
import { ok, created } from '../utils/apiResponse';

export const invitationController = {
  async list(req: Request, res: Response) {
    const invitations = await invitationService.list(req.params.workspaceId);
    return ok(res, { invitations }, 'OK');
  },

  async create(req: Request, res: Response) {
    const { invitation } = await invitationService.create(
      req.params.workspaceId,
      req.user!.id,
      req.body,
      getClientContext(req),
    );
    return created(res, { invitation }, 'Invitation sent.');
  },

  async revoke(req: Request, res: Response) {
    await invitationService.revoke(
      req.params.workspaceId,
      req.user!.id,
      req.params.invitationId,
      getClientContext(req),
    );
    return ok(res, null, 'Invitation revoked.');
  },

  async resend(req: Request, res: Response) {
    const invitation = await invitationService.resend(
      req.params.workspaceId,
      req.user!.id,
      req.params.invitationId,
      getClientContext(req),
    );
    return ok(res, { invitation }, 'Invitation resent.');
  },

  async preview(req: Request, res: Response) {
    const invitation = await invitationService.preview(req.params.token);
    return ok(res, { invitation }, 'OK');
  },

  async accept(req: Request, res: Response) {
    const result = await invitationService.accept(
      req.body.token,
      req.user!.id,
      getClientContext(req),
    );
    return ok(res, result, 'Invitation accepted.');
  },

  async decline(req: Request, res: Response) {
    await invitationService.decline(req.body.token, getClientContext(req));
    return ok(res, null, 'Invitation declined.');
  },
};
