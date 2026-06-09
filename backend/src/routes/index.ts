/**
 * src/routes/index.ts
 * Aggregates all v1 routes under /api/v1.
 */
import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import workspaceRoutes from './workspace.routes';
import invitationRoutes from './invitation.routes';
import { socialPublicRoutes } from './social.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'ok', data: { uptime: process.uptime() } });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/invitations', invitationRoutes);
router.use('/social', socialPublicRoutes);

export default router;
