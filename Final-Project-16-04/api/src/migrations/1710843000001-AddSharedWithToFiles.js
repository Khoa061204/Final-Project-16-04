const { MigrationInterface, QueryRunner } = require("typeorm");

module.exports = class AddSharedWithToFiles1710843000001 {
    async up(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE files 
            ADD COLUMN shared_with JSON DEFAULT ('[]')
        `);
    }

    async down(queryRunner) {
        await queryRunner.query(`
            ALTER TABLE files 
            DROP COLUMN shared_with
        `);
    }
} 