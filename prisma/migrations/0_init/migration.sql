-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SiteStatus" AS ENUM ('draft', 'converting', 'ready', 'published', 'error');

-- CreateEnum
CREATE TYPE "DeployStatus" AS ENUM ('queued', 'building', 'ready', 'error');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "framerUrl" TEXT NOT NULL,
    "themeRef" TEXT,
    "status" "SiteStatus" NOT NULL DEFAULT 'draft',
    "buildHook" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deployment" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'netlify',
    "status" "DeployStatus" NOT NULL DEFAULT 'queued',
    "netlifyDeployId" TEXT,
    "url" TEXT,
    "log" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deployment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Site_ownerId_idx" ON "Site"("ownerId");

-- CreateIndex
CREATE INDEX "Site_status_idx" ON "Site"("status");

-- CreateIndex
CREATE INDEX "Deployment_siteId_createdAt_idx" ON "Deployment"("siteId", "createdAt");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deployment" ADD CONSTRAINT "Deployment_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

