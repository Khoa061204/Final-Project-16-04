const { AppDataSource } = require('./src/config/database');
require('dotenv').config();

async function createMissingTables() {
  console.log('🏗️  Creating missing database tables...');
  
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // Create tables if they don't exist
    const createTableQueries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500),
        theme VARCHAR(20) DEFAULT 'system',
        emailNotifications TINYINT(1) DEFAULT 1,
        pushNotifications TINYINT(1) DEFAULT 1,
        twoFactorEnabled TINYINT(1) DEFAULT 0,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      )`,

      // Teams table
      `CREATE TABLE IF NOT EXISTS teams (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        visibility ENUM('public', 'private') DEFAULT 'private',
        creator_id INT NOT NULL,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Team members table
      `CREATE TABLE IF NOT EXISTS team_members (
        team_id INT NOT NULL,
        user_id INT NOT NULL,
        PRIMARY KEY (team_id, user_id),
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Invitations table
      `CREATE TABLE IF NOT EXISTS invitations (
        id INT PRIMARY KEY AUTO_INCREMENT,
        teamId INT NOT NULL,
        inviteeId INT NOT NULL,
        status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE CASCADE,
        FOREIGN KEY (inviteeId) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Files table
      `CREATE TABLE IF NOT EXISTS files (
        id INT PRIMARY KEY AUTO_INCREMENT,
        filename VARCHAR(255) NOT NULL,
        originalName VARCHAR(255) NOT NULL,
        mimeType VARCHAR(100),
        size BIGINT,
        path VARCHAR(500),
        url VARCHAR(500),
        userId INT NOT NULL,
        folderId INT,
        projectId INT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Documents table
      `CREATE TABLE IF NOT EXISTS documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        content LONGTEXT,
        userId INT NOT NULL,
        projectId INT,
        folderId INT,
        isPublic BOOLEAN DEFAULT false,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Projects table
      `CREATE TABLE IF NOT EXISTS projects (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        userId INT NOT NULL,
        teamId INT,
        status ENUM('active', 'completed', 'archived') DEFAULT 'active',
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE SET NULL
      )`,

      // Tasks table
      `CREATE TABLE IF NOT EXISTS tasks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
        priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
        dueDate DATETIME,
        userId INT NOT NULL,
        projectId INT,
        assignedTo INT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (assignedTo) REFERENCES users(id) ON DELETE SET NULL
      )`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id INT PRIMARY KEY AUTO_INCREMENT,
        userId INT NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSON,
        isRead BOOLEAN DEFAULT false,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
      )`,

      // Folders table
      `CREATE TABLE IF NOT EXISTS folders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        userId INT NOT NULL,
        parentId INT,
        projectId INT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (parentId) REFERENCES folders(id) ON DELETE CASCADE,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      )`,

      // Events table (for calendar)
      `CREATE TABLE IF NOT EXISTS events (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        startDate DATETIME NOT NULL,
        endDate DATETIME NOT NULL,
        allDay BOOLEAN DEFAULT false,
        userId INT NOT NULL,
        projectId INT,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      )`,

      // Shares table
      `CREATE TABLE IF NOT EXISTS shares (
        id INT PRIMARY KEY AUTO_INCREMENT,
        resourceType ENUM('file', 'document', 'folder', 'project') NOT NULL,
        resourceId INT NOT NULL,
        userId INT NOT NULL COMMENT 'The user who owns/shared the resource',
        sharedWith INT NOT NULL COMMENT 'The user who received the share',
        permission ENUM('view', 'edit', 'admin') DEFAULT 'view' NOT NULL,
        sharedVia ENUM('direct', 'team', 'public') DEFAULT 'direct' NOT NULL,
        teamId INT NULL COMMENT 'If shared via team, the team ID',
        expiresAt DATETIME NULL COMMENT 'When the share expires (optional)',
        message TEXT NULL COMMENT 'Optional message when sharing',
        isActive BOOLEAN DEFAULT true NOT NULL,
        lastAccessedAt DATETIME NULL,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) NOT NULL,
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6) NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (sharedWith) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE CASCADE,
        INDEX idx_resource (resourceType, resourceId),
        INDEX idx_shared_with (sharedWith),
        INDEX idx_user (userId),
        INDEX idx_team (teamId),
        INDEX idx_active (isActive),
        INDEX idx_expires (expiresAt),
        UNIQUE KEY unique_share (resourceType, resourceId, sharedWith, isActive)
      )`,

      // Messages table (for team chat)
      `CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        content TEXT NOT NULL,
        userId INT NOT NULL,
        teamId INT NOT NULL,
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (teamId) REFERENCES teams(id) ON DELETE CASCADE
      )`
    ];

    console.log('📋 Creating tables...');
    for (let i = 0; i < createTableQueries.length; i++) {
      try {
        await AppDataSource.query(createTableQueries[i]);
        const tableName = createTableQueries[i].match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
        console.log(`✅ Table '${tableName}' created/verified`);
      } catch (error) {
        console.error(`❌ Error creating table:`, error.message);
      }
    }

    // Create indexes for better performance
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)',
      'CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_invitations_inviteeId ON invitations(inviteeId)',
      'CREATE INDEX IF NOT EXISTS idx_invitations_teamId ON invitations(teamId)',
      'CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status)',
      'CREATE INDEX IF NOT EXISTS idx_files_userId ON files(userId)',
      'CREATE INDEX IF NOT EXISTS idx_documents_userId ON documents(userId)',
      'CREATE INDEX IF NOT EXISTS idx_projects_userId ON projects(userId)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_userId ON tasks(userId)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications(userId)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)'
    ];

    console.log('📊 Creating indexes...');
    for (const indexQuery of indexQueries) {
      try {
        await AppDataSource.query(indexQuery);
        console.log(`✅ Index created`);
      } catch (error) {
        console.log(`⚠️  Index might already exist:`, error.message);
      }
    }

    await AppDataSource.destroy();
    console.log('✅ Database setup completed!');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run the script
createMissingTables().then(() => {
  console.log('\n🎉 All done! Your database is ready.');
  console.log('💡 You can now start your backend server with: npm start');
}).catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
}); 