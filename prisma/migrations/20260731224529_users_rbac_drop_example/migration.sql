-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'VIEWER';

-- DropForeignKey
ALTER TABLE "Example" DROP CONSTRAINT "Example_ownerId_fkey";

-- DropTable
DROP TABLE "Example";

-- DropEnum
DROP TYPE "ExampleStatus";

-- CreateIndex
CREATE INDEX "User_role_createdAt_idx" ON "User"("role", "createdAt");
