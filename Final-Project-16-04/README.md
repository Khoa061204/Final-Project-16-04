# Giggle Drive - Collaborative Cloud Storage & Project Management Platform

A comprehensive web application that combines cloud storage, collaborative document editing, team management, and project management features. Built with React, Node.js, TypeORM, and MySQL.

## 🚀 Features

### 🔐 Authentication & User Management
- User registration and login with JWT authentication
- Password reset functionality with email integration
- User profile management with avatar upload
- Remember me functionality
- Secure token-based authentication

### ☁️ Cloud Storage
- File upload and management with AWS S3 integration
- Support for text/code files with syntax highlighting
- Folder organization with nested folder structure
- File sharing capabilities
- File deletion and organization

### 📄 Collaborative Document Editing
- Real-time collaborative text editing using TipTap
- Multiple users can edit documents simultaneously
- Live cursor tracking for collaborative users
- Document versioning and auto-save
- Rich text formatting options

### 👥 Team Management
- Create and manage teams
- Invite team members via email
- Team member roles and permissions
- Team chat functionality with real-time messaging
- Team invitation system with accept/reject functionality

### 📋 Project Management
- Create and manage projects within teams
- Task creation and assignment
- Task status tracking (To Do, In Progress, Done)
- Task priority levels (Low, Medium, High)
- Due date management with overdue notifications
- Project progress tracking with visual indicators
- My Tasks view for personal task management

### 🎨 Modern UI/UX
- Responsive design with Tailwind CSS
- Modern card-based layout
- Interactive modals and forms
- Loading states and error handling
- Smooth animations and transitions
- Mobile-friendly interface

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern React with hooks
- **React Router** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **React Icons** - Icon library
- **TipTap** - Rich text editor
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **TypeORM** - Object-Relational Mapping
- **MySQL** - Database
- **JWT** - Authentication
- **Socket.IO** - Real-time communication
- **AWS SDK** - S3 integration
- **Multer** - File upload handling
- **Nodemailer** - Email functionality
- **bcryptjs** - Password hashing

### Infrastructure
- **AWS S3** - File storage
- **MySQL Database** - Data persistence

## 📁 Project Structure

```
├── api/                          # Backend API server
│   ├── src/
│   │   └── entities/             # TypeORM entities
│   │       ├── User.js
│   │       ├── Document.js
│   │       ├── File.js
│   │       ├── Folder.js
│   │       ├── Team.js
│   │       ├── Project.js
│   │       ├── Task.js
│   │       ├── Message.js
│   │       └── Invitation.js
│   ├── routes/                   # API routes
│   ├── middleware/               # Express middleware
│   ├── utils/                    # Utility functions
│   ├── server.js                 # Main server file
│   ├── data-source.js            # Database configuration
│   └── package.json
├── front-end/                    # React frontend
│   ├── src/
│   │   ├── Pages/                # Page components
│   │   │   ├── Home.js
│   │   │   ├── Login.js
│   │   │   ├── Register.js
│   │   │   ├── ProjectsPage.js
│   │   │   ├── ProjectDetailPage.js
│   │   │   ├── MyTasksPage.js
│   │   │   ├── Teams.js
│   │   │   ├── TextEditor.js
│   │   │   └── UploadFile.js
│   │   ├── components/           # Reusable components
│   │   │   ├── Sidebar.js
│   │   │   ├── MainLayout.js
│   │   │   ├── TeamChat.js
│   │   │   └── Profile.js
│   │   ├── utils/                # Utility functions
│   │   ├── App.js                # Main app component
│   │   └── index.js
│   └── package.json
├── websocket-server/             # WebSocket server (optional)
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- AWS S3 bucket (for file storage)
- Email service (for password reset)

### Environment Variables

Create `.env` files in both `api/` and `front-end/` directories:

#### Backend (.env in api/ directory)
```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASS=your_mysql_password
DB_NAME=your_database_name

# JWT
JWT_SECRET=your_jwt_secret_key

# AWS S3
AWS_REGION=your_aws_region
REACT_APP_AWS_BUCKET_NAME=your_s3_bucket_name
REACT_APP_AWS_ACCESS_KEY_ID=your_aws_access_key
REACT_APP_AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Email (for password reset)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_email_password

# Server
PORT=5000
```

#### Frontend (.env in front-end/ directory)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd giggle-drive
   ```

2. **Install backend dependencies**
   ```bash
   cd api
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../front-end
   npm install
   ```

4. **Set up the database**
   ```bash
   cd ../api
   npm run migration:run
   ```

5. **Start the backend server**
   ```bash
   npm start
   ```

6. **Start the frontend development server**
   ```bash
   cd ../front-end
   npm start
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📋 API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `POST /request-reset` - Request password reset
- `POST /reset-password` - Reset password
- `GET /verify-token` - Verify JWT token

### Files
- `POST /upload` - Upload file
- `GET /files` - Get user files
- `DELETE /files/:id` - Delete file
- `PUT /files/:id` - Move file to folder
- `POST /files/:id/share` - Share file

### Documents
- `GET /documents` - Get user documents
- `POST /documents` - Create document
- `PUT /documents/:id` - Update document
- `DELETE /documents/:id` - Delete document
- `POST /documents/:id/share` - Share document

### Folders
- `POST /folders` - Create folder
- `GET /folders` - Get user folders
- `DELETE /folders/:id` - Delete folder
- `GET /folders/:folderId/files` - Get files in folder

### Teams
- `GET /api/teams` - Get user teams
- `POST /api/teams` - Create team
- `POST /api/teams/:teamId/members` - Add team member
- `DELETE /api/teams/:teamId/members/:memberId` - Remove team member
- `DELETE /api/teams/:teamId` - Delete team
- `POST /api/teams/:teamId/invite` - Send team invitation
- `GET /api/teams/invitations` - Get pending invitations
- `POST /api/teams/invitations/:inviteId/accept` - Accept invitation
- `POST /api/teams/invitations/:inviteId/reject` - Reject invitation

### Projects
- `GET /api/projects` - Get user projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/projects/:projectId/tasks` - Get project tasks
- `POST /api/projects/:projectId/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/my-tasks` - Get user's assigned tasks

## 🔧 Development

### Running in Development Mode
```bash
# Backend
cd api
npm run dev

# Frontend
cd front-end
npm start
```

### Building for Production
```bash
# Frontend
cd front-end
npm run build
```

### Database Migrations
```bash
cd api
npm run migration:run
```

## 🎯 Key Features Explained

### Real-time Collaboration
- Uses Socket.IO for real-time document editing
- Multiple users can edit the same document simultaneously
- Live cursor tracking shows who is editing where
- Auto-save functionality prevents data loss

### Project Management
- Kanban-style task management with status columns
- Task assignment and priority management
- Due date tracking with overdue notifications
- Project progress visualization
- Team-based project organization

### File Management
- AWS S3 integration for scalable file storage
- Folder organization with nested structure
- File sharing between users
- Support for various file types
- Secure file access control

### Team Collaboration
- Team creation and member management
- Real-time team chat
- Team invitation system
- Role-based access control
- Project assignment to teams

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MySQL is running
   - Check database credentials in `.env`
   - Verify database exists

2. **AWS S3 Upload Issues**
   - Verify AWS credentials
   - Check S3 bucket permissions
   - Ensure bucket region is correct

3. **Email Not Working**
   - Check email service credentials
   - Verify email service settings
   - Test with a valid email address

4. **Real-time Features Not Working**
   - Ensure Socket.IO server is running
   - Check CORS settings
   - Verify WebSocket connections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- React team for the amazing framework
- TypeORM for excellent database management
- Tailwind CSS for the utility-first approach
- AWS for reliable cloud services
- Socket.IO for real-time capabilities

---

**Giggle Drive** - Making collaboration simple and efficient! 🚀 