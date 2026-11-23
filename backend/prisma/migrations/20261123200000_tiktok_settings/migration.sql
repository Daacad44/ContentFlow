-- Per-platform post settings (TikTok privacy/interaction choices) and the Zernio post id
-- per target, so posts the platform is still processing can be confirmed later by cron.
ALTER TABLE "posts" ADD COLUMN "platformSettings" JSONB;
ALTER TABLE "post_targets" ADD COLUMN "zernioPostId" TEXT;
CREATE INDEX "post_targets_status_idx" ON "post_targets"("status");
