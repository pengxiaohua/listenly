-- AlterTable
ALTER TABLE "User" ADD COLUMN "userName" TEXT NOT NULL DEFAULT '',
                   ADD COLUMN "avatar" TEXT NOT NULL DEFAULT '';

-- After adding the columns with defaults, we can remove the defaults
ALTER TABLE "User" ALTER COLUMN "userName" DROP DEFAULT,
                   ALTER COLUMN "avatar" DROP DEFAULT;
