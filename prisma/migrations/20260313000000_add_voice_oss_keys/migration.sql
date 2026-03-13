-- AlterTable: Word - 添加4种发音人音效的 OSS Key
ALTER TABLE "Word" ADD COLUMN "ossKeyMaleUs" TEXT;
ALTER TABLE "Word" ADD COLUMN "ossKeyFemaleUs" TEXT;
ALTER TABLE "Word" ADD COLUMN "ossKeyMaleUk" TEXT;
ALTER TABLE "Word" ADD COLUMN "ossKeyFemaleUk" TEXT;

-- AlterTable: Sentence - 添加4种发音人音效的 OSS Key
ALTER TABLE "Sentence" ADD COLUMN "ossKeyMaleUs" TEXT;
ALTER TABLE "Sentence" ADD COLUMN "ossKeyFemaleUs" TEXT;
ALTER TABLE "Sentence" ADD COLUMN "ossKeyMaleUk" TEXT;
ALTER TABLE "Sentence" ADD COLUMN "ossKeyFemaleUk" TEXT;

-- AlterTable: Shadowing - 添加4种发音人音效的 OSS Key
ALTER TABLE "Shadowing" ADD COLUMN "ossKeyMaleUs" TEXT;
ALTER TABLE "Shadowing" ADD COLUMN "ossKeyFemaleUs" TEXT;
ALTER TABLE "Shadowing" ADD COLUMN "ossKeyMaleUk" TEXT;
ALTER TABLE "Shadowing" ADD COLUMN "ossKeyFemaleUk" TEXT;
