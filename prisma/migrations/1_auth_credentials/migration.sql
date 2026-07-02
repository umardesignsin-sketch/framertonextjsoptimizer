-- Non-destructive: table has 0 rows at this point, adding required columns is safe.
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

ALTER TABLE "Site" ADD COLUMN "outputKind" TEXT NOT NULL DEFAULT 'hybrid';
