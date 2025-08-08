const { DataSource } = require('typeorm');
require('dotenv').config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'final_project', // Fixed: Changed from 'cloudsync_db' to match backend
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development',
  entities: [
    require('../models/User.js'),
    require('../models/File.js'),
    require('../models/Folder.js'),
    require('../models/Document.js'),
    require('../models/Team.js'),
    require('../models/Project.js'),
    require('../models/Task.js'),
    require('../models/Notification.js'),
    require('../models/Message.js'),
    require('../models/Share.js'),
    require('../models/Event.js'),
    require('../models/Invitation.js'),
    require('../models/TeamMember.js')
  ],
  migrations: [
    'src/migrations/*.js'
  ],
  subscribers: [
    'src/subscribers/*.js'
  ],
  cli: {
    entitiesDir: 'src/models',
    migrationsDir: 'src/migrations',
    subscribersDir: 'src/subscribers'
  },
  driver: require("mysql2"),
  extra: {
    connectionLimit: 10,
    allowPublicKeyRetrieval: true
  }
});

module.exports = { AppDataSource }; 