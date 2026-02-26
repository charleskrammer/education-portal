-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "track" TEXT NOT NULL DEFAULT 'business';

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
