-- AI live-site editor: redeploy target + opt-in encrypted deploy token.
ALTER TABLE "Deployment" ADD COLUMN "externalId" TEXT;
ALTER TABLE "Deployment" ADD COLUMN "tokenEnc" TEXT;
