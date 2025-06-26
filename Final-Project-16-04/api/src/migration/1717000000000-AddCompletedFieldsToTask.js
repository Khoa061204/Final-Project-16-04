module.exports = class AddCompletedFieldsToTask1717000000000 {
  name = 'AddCompletedFieldsToTask1717000000000'

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE tasks
      ADD COLUMN completedByUserId int NULL,
      ADD COLUMN completedAt datetime NULL,
      ADD CONSTRAINT FK_completedByUser FOREIGN KEY (completedByUserId) REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE tasks
      DROP FOREIGN KEY FK_completedByUser,
      DROP COLUMN completedByUserId,
      DROP COLUMN completedAt
    `);
  }
} 