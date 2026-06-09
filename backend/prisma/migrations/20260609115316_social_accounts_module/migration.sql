-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "SocialAccountStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'TOKEN_EXPIRED', 'ERROR', 'PENDING');

-- CreateTable
CREATE TABLE "social_profiles" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "zernioProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "connected_accounts" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "socialProfileId" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "zernioAccountId" TEXT NOT NULL,
    "externalAccountId" TEXT,
    "displayName" TEXT,
    "username" TEXT,
    "avatarUrl" TEXT,
    "accountType" TEXT,
    "status" "SocialAccountStatus" NOT NULL DEFAULT 'CONNECTED',
    "metadata" JSONB,
    "connectedByUserId" UUID,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connected_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_oauth_states" (
    "id" UUID NOT NULL,
    "socialProfileId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "userId" UUID NOT NULL,
    "redirectPath" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_oauth_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_profiles_workspaceId_key" ON "social_profiles"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "social_profiles_zernioProfileId_key" ON "social_profiles"("zernioProfileId");

-- CreateIndex
CREATE INDEX "social_profiles_zernioProfileId_idx" ON "social_profiles"("zernioProfileId");

-- CreateIndex
CREATE INDEX "connected_accounts_workspaceId_idx" ON "connected_accounts"("workspaceId");

-- CreateIndex
CREATE INDEX "connected_accounts_platform_idx" ON "connected_accounts"("platform");

-- CreateIndex
CREATE INDEX "connected_accounts_status_idx" ON "connected_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "connected_accounts_workspaceId_zernioAccountId_key" ON "connected_accounts"("workspaceId", "zernioAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "social_oauth_states_tokenHash_key" ON "social_oauth_states"("tokenHash");

-- CreateIndex
CREATE INDEX "social_oauth_states_tokenHash_idx" ON "social_oauth_states"("tokenHash");

-- CreateIndex
CREATE INDEX "social_oauth_states_socialProfileId_idx" ON "social_oauth_states"("socialProfileId");

-- AddForeignKey
ALTER TABLE "social_profiles" ADD CONSTRAINT "social_profiles_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "connected_accounts" ADD CONSTRAINT "connected_accounts_socialProfileId_fkey" FOREIGN KEY ("socialProfileId") REFERENCES "social_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_oauth_states" ADD CONSTRAINT "social_oauth_states_socialProfileId_fkey" FOREIGN KEY ("socialProfileId") REFERENCES "social_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
