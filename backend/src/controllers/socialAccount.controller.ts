/**
 * src/controllers/socialAccount.controller.ts
 * HTTP handlers for social account connect, sync, and management.
 */
import { Request, Response } from 'express';
import { socialAccountService } from '../services/socialAccount.service';
import { getClientContext } from '../utils/requestContext';
import { ok, created } from '../utils/apiResponse';
import { env } from '../config/env';

export const socialAccountController = {
  async list(req: Request, res: Response) {
    const accounts = await socialAccountService.list(req.params.workspaceId);
    return ok(res, { accounts }, 'OK');
  },

  async connect(req: Request, res: Response) {
    const result = await socialAccountService.startConnect({
      workspaceId: req.params.workspaceId,
      workspaceName: req.workspace!.name,
      platform: req.body.platform,
      userId: req.user!.id,
      redirectPath: req.body.redirectPath,
      ctx: getClientContext(req),
    });
    return ok(res, result, 'Connect URL generated.');
  },

  async sync(req: Request, res: Response) {
    const result = await socialAccountService.syncAccounts(
      req.params.workspaceId,
      req.user!.id,
      getClientContext(req),
    );
    return ok(res, result, 'Accounts synced.');
  },

  async disconnect(req: Request, res: Response) {
    await socialAccountService.disconnect(
      req.params.workspaceId,
      req.params.accountId,
      req.user!.id,
      getClientContext(req),
    );
    return ok(res, null, 'Account disconnected.');
  },

  async checkHealth(req: Request, res: Response) {
    const health = await socialAccountService.checkHealth(
      req.params.workspaceId,
      req.params.accountId,
    );
    return ok(res, { health }, 'OK');
  },

  async tiktokCreatorInfo(req: Request, res: Response) {
    const mediaType = req.query.mediaType === 'photo' ? 'photo' : 'video';
    const info = await socialAccountService.getTikTokCreatorInfo(
      req.params.workspaceId,
      req.params.accountId,
      mediaType,
    );
    return ok(res, { creatorInfo: info }, 'OK');
  },

  async listSelection(req: Request, res: Response) {
    const options = await socialAccountService.listSelectionOptions({
      workspaceId: req.params.workspaceId,
      platform: req.body.platform,
      profileId: req.body.profileId,
      tempToken: req.body.tempToken,
      connectToken: req.body.connectToken,
    });
    return ok(res, options, 'OK');
  },

  async completeSelection(req: Request, res: Response) {
    const result = await socialAccountService.completeSelection({
      workspaceId: req.params.workspaceId,
      platform: req.body.platform,
      profileId: req.body.profileId,
      itemId: req.body.itemId,
      tempToken: req.body.tempToken,
      userProfile: req.body.userProfile,
      connectToken: req.body.connectToken,
      userId: req.user!.id,
      ctx: getClientContext(req),
    });
    return created(res, result, 'Account connected.');
  },

  /** Public OAuth callback — Zernio redirects here after platform authorization. */
  async oauthCallback(req: Request, res: Response) {
    const query = req.query as Record<string, string | undefined>;
    try {
      const result = await socialAccountService.handleOAuthCallback(query, getClientContext(req));

      if (result.type === 'selection') {
        const params = new URLSearchParams({
          workspaceId: result.workspaceId,
          platform: result.platform,
          profileId: result.profileId,
          tempToken: result.tempToken,
          step: result.step,
          userProfile: result.userProfile,
        });
        if (result.connectToken) params.set('connectToken', result.connectToken);
        return res.redirect(`${env.CLIENT_URL}/social/select?${params.toString()}`);
      }

      const redirect = `${env.CLIENT_URL}${result.redirectPath}?connected=true&workspaceId=${result.workspaceId}`;
      return res.redirect(redirect);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to complete account connection.';
      const params = new URLSearchParams({ error: message });
      return res.redirect(`${env.CLIENT_URL}/accounts?${params.toString()}`);
    }
  },
};
