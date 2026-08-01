-- Vercel team/scope id was accepted on the initial deploy request but never
-- persisted, so republish (lib/editor-publish.ts) always redeployed without
-- it — silently targeting the wrong (personal) scope for any team-scoped
-- Vercel project, leaving the real live site never updated.
ALTER TABLE "Deployment" ADD COLUMN "teamId" TEXT;
