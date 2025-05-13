const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class UpdateFolderStructure1710843000000 {
    name = 'UpdateFolderStructure1710843000000'

    async up(queryRunner) {
        // Drop existing folders table and recreate with new structure
        await queryRunner.query(`DROP TABLE IF EXISTS "folders"`);
        
        await queryRunner.query(`
            CREATE TABLE "folders" (
                "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "name" varchar(255) NOT NULL,
                "parent_id" uuid,
                "path" varchar(1000),
                "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                CONSTRAINT "fk_folder_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "fk_folder_parent" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE SET NULL
            )
        `);

        // Create index for faster folder lookups
        await queryRunner.query(`
            CREATE INDEX "idx_folder_user" ON "folders"("user_id")
        `);
        await queryRunner.query(`
            CREATE INDEX "idx_folder_parent" ON "folders"("parent_id")
        `);
    }

    async down(queryRunner) {
        // Remove indexes
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_folder_parent"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_folder_user"`);
        
        // Drop the new folders table
        await queryRunner.query(`DROP TABLE IF EXISTS "folders"`);
        
        // Recreate original folders table
        await queryRunner.query(`
            CREATE TABLE "folders" (
                "id" SERIAL PRIMARY KEY,
                "user_id" integer NOT NULL,
                "name" varchar(255) NOT NULL,
                "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                CONSTRAINT "fk_folder_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
    }
} 