# 🚀 Enhanced Sharing System

A comprehensive sharing system for files, documents, folders, and projects with advanced permissions, team collaboration, and enterprise-level features.

## ✨ Features

### 🎯 **Core Sharing Capabilities**
- **Multiple Resource Types**: Share files, documents, folders, and projects
- **Individual & Team Sharing**: Share directly with users or entire teams
- **Advanced Permissions**: View, Edit, and Admin permission levels
- **Smart User Search**: Find users by name or email with autocomplete
- **Bulk Operations**: Share with multiple users and teams at once

### 🔐 **Security & Permissions**
- **Permission Levels**: 
  - `View`: Can view the item but not make changes
  - `Edit`: Can view and edit the item
  - `Admin`: Full control including sharing with others
- **Expiration Dates**: Set automatic expiry for shares
- **Active Status**: Soft delete with ability to revoke access
- **Ownership Validation**: Only resource owners can share

### 👥 **Team Integration**
- **Team-based Sharing**: Share with entire teams in one click
- **Member Filtering**: Automatically excludes existing members
- **Team Context**: Shows which team shared the item
- **Bulk Team Invites**: Share with multiple teams simultaneously

### 📊 **Analytics & Tracking**
- **Access Tracking**: Monitor when items were last accessed
- **Sharing Statistics**: View comprehensive sharing metrics
- **Activity History**: Track sharing activity and changes
- **Usage Analytics**: Understand sharing patterns

### 🎨 **User Experience**
- **Beautiful UI**: Modern, responsive design with dark mode support
- **Real-time Search**: Instant user and team suggestions
- **Visual Feedback**: Clear permission indicators and status badges
- **Mobile Friendly**: Responsive design for all devices

## 🛠️ Setup & Installation

### 1. **Database Migration**

First, migrate your database to support the new sharing structure:

```bash
cd backend
node migrate-shares-table.js
```

This will:
- Backup existing shares (if any)
- Create the new enhanced shares table
- Migrate existing data to new format
- Add proper indexes for performance

### 2. **Start Services**

Start your backend and frontend services:

```bash
# Backend (from backend directory)
npm start

# Frontend (from frontend directory)  
npm start
```

### 3. **Verify Installation**

- ✅ Check that the shares table exists in your database
- ✅ Visit the "Shared with Me" page in your frontend
- ✅ Try sharing a file or document
- ✅ Test team-based sharing

## 📚 API Reference

### **Share Resource**
```http
POST /api/shares
```

**Request Body:**
```json
{
  "resourceType": "file|document|folder|project",
  "resourceId": 123,
  "users": [
    { "id": 456, "email": "user@example.com" }
  ],
  "teams": [
    { "id": 789 }
  ],
  "permission": "view|edit|admin",
  "message": "Optional sharing message",
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "successful": [...],
    "failed": [...],
    "alreadyShared": [...]
  }
}
```

### **Get Shared Items**
```http
GET /api/shares/shared-with-me?page=1&limit=20&resourceType=file
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

### **Get Resource Shares**
```http
GET /api/shares/resource/:resourceType/:resourceId
```

### **Update Share Permission**
```http
PUT /api/shares/:shareId/permission
```

### **Remove Share**
```http
DELETE /api/shares/:shareId
```

### **Get Sharing Statistics**
```http
GET /api/shares/stats
```

## 🎨 Frontend Components

### **ShareModal Component**

The main sharing interface with tabs for users and teams:

```jsx
import ShareModal from './components/ShareModal';

<ShareModal
  isOpen={showShareModal}
  onClose={() => setShowShareModal(false)}
  resourceType="file"
  resourceId={123}
  resourceName="My Document.pdf"
  onShareSuccess={(result) => console.log('Shared!', result)}
/>
```

### **UserSearch Component**

Advanced user search with multiple selection:

```jsx
import UserSearch from './components/UserSearch';

<UserSearch
  selectedUsers={selectedUsers}
  onUsersChange={setSelectedUsers}
  excludeTeamId={teamId}
  placeholder="Search users..."
/>
```

### **SharedWithMe Page**

Dedicated page for viewing all shared items:

```jsx
import SharedWithMe from './Pages/SharedWithMe';

// Available at /shared-with-me route
```

## 🔧 Configuration

### **Environment Variables**

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=final_project

# API Configuration
REACT_APP_API_URL=http://localhost:5000/api
```

### **Permission Levels**

The system supports three permission levels:

| Permission | Description | Capabilities |
|------------|-------------|--------------|
| **View** | Read-only access | • View content<br>• Download files<br>• Cannot edit or share |
| **Edit** | Full content access | • All View permissions<br>• Edit content<br>• Upload new versions<br>• Cannot share with others |
| **Admin** | Complete control | • All Edit permissions<br>• Share with others<br>• Change permissions<br>• Remove access |

## 🎯 Usage Examples

### **Basic File Sharing**

```jsx
// Share a file with specific users
const shareFile = async () => {
  const response = await fetch('/api/shares', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      resourceType: 'file',
      resourceId: 123,
      users: [
        { email: 'colleague@company.com' },
        { id: 456 }
      ],
      permission: 'edit',
      message: 'Please review this document'
    })
  });
};
```

### **Team Sharing**

```jsx
// Share with entire teams
const shareWithTeams = async () => {
  const response = await fetch('/api/shares', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      resourceType: 'project',
      resourceId: 789,
      teams: [
        { id: 101 },
        { id: 102 }
      ],
      permission: 'view',
      expiresAt: '2024-12-31T23:59:59Z'
    })
  });
};
```

### **Check Share Status**

```jsx
// Get all shares for a resource
const getResourceShares = async (resourceType, resourceId) => {
  const response = await fetch(`/api/shares/resource/${resourceType}/${resourceId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  console.log('Direct shares:', data.data.directShares);
  console.log('Team shares:', data.data.teamShares);
};
```

## 🚨 Troubleshooting

### **Common Issues**

1. **"Share not found" error**
   - Ensure the user owns the resource
   - Check that the resource ID and type are correct

2. **Users not appearing in search**
   - Verify users exist in the database
   - Check that search query is at least 2 characters

3. **Team sharing not working**
   - Ensure user is a member of the team
   - Verify team exists and is active

4. **Permission errors**
   - Only resource owners can share
   - Check user authentication

### **Database Issues**

If you encounter database errors:

```bash
# Recreate the shares table
cd backend
node create-missing-tables.js

# Or run the migration again
node migrate-shares-table.js
```

### **Performance Optimization**

For better performance with large datasets:

1. **Database Indexes**: Already included in migration
2. **Pagination**: Use page/limit parameters
3. **Filtering**: Filter by resourceType when possible
4. **Caching**: Client-side caching is implemented

## 🔮 Advanced Features

### **Custom Sharing Messages**

Add context to your shares:

```jsx
{
  message: "Please review by Friday. Focus on the financial projections in section 3."
}
```

### **Expiration Dates**

Set automatic expiry:

```jsx
{
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
}
```

### **Bulk Operations**

Share with multiple users and teams:

```jsx
{
  users: [
    { email: 'user1@company.com' },
    { email: 'user2@company.com' },
    { id: 123 }
  ],
  teams: [
    { id: 456 },
    { id: 789 }
  ]
}
```

### **Analytics Integration**

Track sharing patterns:

```jsx
const getStats = async () => {
  const response = await fetch('/api/shares/stats');
  const data = await response.json();
  
  console.log(`You've shared ${data.data.shared.totalShares} items`);
  console.log(`You have access to ${data.data.received.totalReceived} shared items`);
};
```

## 🤝 Contributing

To extend the sharing system:

1. **Backend**: Modify `backend/src/routes/shares.js`
2. **Frontend**: Update components in `frontend/src/components/`
3. **Database**: Update `backend/src/models/Share.js`

## 📄 License

This sharing system is part of the main project and follows the same license terms.

---

## 🎉 **You're All Set!**

Your enhanced sharing system is now ready to use. Users can:

- ✅ Share any resource with anyone
- ✅ Set granular permissions
- ✅ Collaborate with teams
- ✅ Track sharing activity
- ✅ Manage access centrally

**Happy sharing!** 🚀 