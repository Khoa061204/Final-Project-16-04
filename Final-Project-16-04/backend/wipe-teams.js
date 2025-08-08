const { AppDataSource } = require('./src/config/database');
require('dotenv').config();

async function wipeTeams() {
  console.log('🧹 Wiping all teams and related data...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Start a transaction to ensure data consistency
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Delete team members first (due to foreign key constraints)
      console.log('🗑️  Deleting team members...');
      const teamMembersResult = await queryRunner.query('DELETE FROM team_members');
      console.log(`✅ Deleted ${teamMembersResult.affectedRows || 0} team members`);

      // 2. Delete invitations related to teams
      console.log('🗑️  Deleting team invitations...');
      const invitationsResult = await queryRunner.query('DELETE FROM invitations');
      console.log(`✅ Deleted ${invitationsResult.affectedRows || 0} invitations`);

      // 3. Set teamId to NULL for projects (or delete projects if you want)
      console.log('🗑️  Updating projects to remove team references...');
      const projectsResult = await queryRunner.query('UPDATE projects SET teamId = NULL WHERE teamId IS NOT NULL');
      console.log(`✅ Updated ${projectsResult.affectedRows || 0} projects`);

      // 4. Delete teams
      console.log('🗑️  Deleting teams...');
      const teamsResult = await queryRunner.query('DELETE FROM teams');
      console.log(`✅ Deleted ${teamsResult.affectedRows || 0} teams`);

      // 5. Reset auto-increment counters
      console.log('🔄 Resetting auto-increment counters...');
      await queryRunner.query('ALTER TABLE team_members AUTO_INCREMENT = 1');
      await queryRunner.query('ALTER TABLE teams AUTO_INCREMENT = 1');
      console.log('✅ Auto-increment counters reset');

      // Commit the transaction
      await queryRunner.commitTransaction();
      console.log('🎉 Teams wipe completed successfully!');
      
    } catch (error) {
      // Rollback the transaction on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release the query runner
      await queryRunner.release();
    }
    
  } catch (error) {
    console.error('❌ Error wiping teams:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

wipeTeams(); 