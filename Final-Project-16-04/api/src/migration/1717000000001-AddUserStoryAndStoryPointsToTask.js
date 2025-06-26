module.exports = class AddUserStoryAndStoryPointsToTask1717000000001 {
  name = 'AddUserStoryAndStoryPointsToTask1717000000001'

  async up(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE tasks
      ADD COLUMN userStory varchar(255) NULL,
      ADD COLUMN storyPoints int NULL
    `);
  }

  async down(queryRunner) {
    await queryRunner.query(`
      ALTER TABLE tasks
      DROP COLUMN userStory,
      DROP COLUMN storyPoints
    `);
  }
} 