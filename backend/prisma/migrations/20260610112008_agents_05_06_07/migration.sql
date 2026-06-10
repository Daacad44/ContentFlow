-- CreateEnum
CREATE TYPE "PublishJobStatus" AS ENUM ('QUEUED', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContentTemplateType" AS ENUM ('CAPTION', 'POST', 'CTA', 'HASHTAG', 'CALENDAR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CreativeAssetType" AS ENUM ('IMAGE', 'POSTER', 'BANNER', 'AD', 'SOCIAL_CREATIVE');

-- CreateTable
CREATE TABLE "publish_jobs" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "bullJobId" TEXT,
    "status" "PublishJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publish_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publish_logs" (
    "id" UUID NOT NULL,
    "publishJobId" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publish_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_templates" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "createdById" UUID,
    "name" TEXT NOT NULL,
    "type" "ContentTemplateType" NOT NULL,
    "prompt" TEXT,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_contents" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID,
    "type" "ContentTemplateType" NOT NULL,
    "prompt" TEXT,
    "input" JSONB,
    "output" TEXT NOT NULL,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_kits" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default Brand Kit',
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "accentColor" TEXT,
    "fontHeading" TEXT,
    "fontBody" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_kits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_templates" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CreativeAssetType" NOT NULL,
    "templateData" JSONB NOT NULL,
    "previewUrl" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creative_assets" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "createdById" UUID,
    "type" "CreativeAssetType" NOT NULL,
    "name" TEXT NOT NULL,
    "prompt" TEXT,
    "url" TEXT NOT NULL,
    "cloudinaryPublicId" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creative_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publish_jobs_bullJobId_key" ON "publish_jobs"("bullJobId");

-- CreateIndex
CREATE INDEX "publish_jobs_postId_idx" ON "publish_jobs"("postId");

-- CreateIndex
CREATE INDEX "publish_jobs_workspaceId_idx" ON "publish_jobs"("workspaceId");

-- CreateIndex
CREATE INDEX "publish_jobs_status_idx" ON "publish_jobs"("status");

-- CreateIndex
CREATE INDEX "publish_jobs_scheduledFor_idx" ON "publish_jobs"("scheduledFor");

-- CreateIndex
CREATE INDEX "publish_logs_publishJobId_idx" ON "publish_logs"("publishJobId");

-- CreateIndex
CREATE INDEX "content_templates_workspaceId_idx" ON "content_templates"("workspaceId");

-- CreateIndex
CREATE INDEX "content_templates_type_idx" ON "content_templates"("type");

-- CreateIndex
CREATE INDEX "generated_contents_workspaceId_idx" ON "generated_contents"("workspaceId");

-- CreateIndex
CREATE INDEX "generated_contents_type_idx" ON "generated_contents"("type");

-- CreateIndex
CREATE UNIQUE INDEX "brand_kits_workspaceId_key" ON "brand_kits"("workspaceId");

-- CreateIndex
CREATE INDEX "brand_templates_workspaceId_idx" ON "brand_templates"("workspaceId");

-- CreateIndex
CREATE INDEX "brand_templates_type_idx" ON "brand_templates"("type");

-- CreateIndex
CREATE INDEX "creative_assets_workspaceId_idx" ON "creative_assets"("workspaceId");

-- CreateIndex
CREATE INDEX "creative_assets_type_idx" ON "creative_assets"("type");

-- AddForeignKey
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_jobs" ADD CONSTRAINT "publish_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publish_logs" ADD CONSTRAINT "publish_logs_publishJobId_fkey" FOREIGN KEY ("publishJobId") REFERENCES "publish_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_templates" ADD CONSTRAINT "content_templates_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_contents" ADD CONSTRAINT "generated_contents_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_contents" ADD CONSTRAINT "generated_contents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_kits" ADD CONSTRAINT "brand_kits_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_templates" ADD CONSTRAINT "brand_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_assets" ADD CONSTRAINT "creative_assets_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creative_assets" ADD CONSTRAINT "creative_assets_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
