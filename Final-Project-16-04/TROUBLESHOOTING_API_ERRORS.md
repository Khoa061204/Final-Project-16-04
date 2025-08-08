# 🔧 API Errors Troubleshooting Guide

This guide will help you fix all the API errors shown in your browser console.

## 🚨 Current Issues Identified

Based on your console errors, you have:
- ❌ **400 Bad Request** errors for `/api/teams/invitations`
- ❌ **404 Not Found** errors for `/api/users/search` and `/api/users/suggestions`
- ❌ **Failed to fetch invitations** errors

## 🎯 Step-by-Step Fix Process

### Step 1: Test Database Connection & Environment

First, let's check if your database and environment are properly configured:

```bash
cd backend
node test-api-endpoints.js
```

This will show you:
- ✅/❌ Environment variables status
- ✅/❌ Database connection status  
- ✅/❌ Database tables existence
- ✅/❌ Sample data verification

### Step 2: Create/Fix Database Tables

If Step 1 shows missing tables, run:

```bash
cd backend
node create-missing-tables.js
```

This will:
- 🏗️ Create all required database tables
- 📊 Add performance indexes
- ✅ Verify table structure

### Step 3: Start Backend with Debug Logging

Start your backend server to see detailed logs:

```bash
cd backend
npm start
```

**Watch for these logs in your backend console:**
- `📥 Fetching invitations for user ID: X` - Should appear when Teams page loads
- `🔍 User search request: {...}` - Should appear when typing in user search
- `💡 User suggestions request for user ID: X` - Should appear when opening invite modal

### Step 4: Test Frontend API Calls

1. **Open your frontend** at `http://localhost:3000`
2. **Login** with your user account
3. **Go to Teams page** and watch backend console
4. **Try the new user search** by clicking "Invite" on a team

## 🛠️ Common Fixes

### Fix 1: Environment Variables (.env file)

Your `backend/.env` file should contain:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASS=your_password
DB_NAME=final_project

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# AWS Configuration (for file uploads)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_BUCKET_NAME=your_bucket_name
AWS_REGION=us-east-1

# Server Configuration
PORT=5000
FRONTEND_URL=http://localhost:3000
```

### Fix 2: Database Connection Issues

If you see database connection errors:

1. **Check MySQL is running:**
   ```bash
   # Windows
   net start mysql

   # Or check if it's running
   tasklist | findstr mysql
   ```

2. **Test manual connection:**
   ```bash
   mysql -u root -p
   use final_project;
   show tables;
   ```

### Fix 3: Missing Database Tables

Run the table creation script:
```bash
cd backend
node create-missing-tables.js
```

### Fix 4: Authentication Issues

If you see "❌ No user ID found" errors:

1. **Check JWT token in localStorage:**
   - Open browser DevTools → Application → Local Storage
   - Look for `token` key
   - If missing, logout and login again

2. **Verify JWT_SECRET:**
   - Ensure same JWT_SECRET in both frontend and backend
   - Restart backend after changing JWT_SECRET

## 🔍 Advanced Debugging

### Check Specific API Endpoints

Test each endpoint manually:

```bash
# Test user search (replace TOKEN with your actual token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/users/search?query=test"

# Test user suggestions
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/users/suggestions"

# Test team invitations
curl -H "Authorization: Bearer YOUR_TOKEN" \
     "http://localhost:5000/api/teams/invitations"
```

### Backend Log Analysis

Look for these patterns in backend console:

**✅ Good logs:**
```
✅ Database connected successfully
📥 Fetching invitations for user ID: 1
✅ Found 2 users matching search
💡 User suggestions request for user ID: 1
```

**❌ Problem logs:**
```
❌ Database not initialized
❌ No user ID found in request
❌ Error searching users: Table 'final_project.users' doesn't exist
```

## 🚀 Test the New User Search Feature

After fixing the errors:

1. **Go to Teams page**
2. **Click "Invite" on any team**
3. **Type in the search box** - you should see:
   - Real-time search suggestions
   - Beautiful user cards with avatars
   - Multiple user selection with chips
   - Smart filtering (excludes existing members)

## 📞 Still Having Issues?

If you're still seeing errors after following these steps:

1. **Share the output** of `node test-api-endpoints.js`
2. **Share your backend console logs** when accessing the Teams page
3. **Share your browser console errors** (with timestamps)

The new user search system is much more powerful than the old email-based approach, but it requires all the backend endpoints to be working properly! 🎯

---

**💡 Pro Tip:** Keep the backend console open while testing - the detailed logging will show you exactly what's happening with each API call! 