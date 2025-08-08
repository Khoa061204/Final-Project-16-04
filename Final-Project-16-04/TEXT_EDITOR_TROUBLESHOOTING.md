# Text Editor Troubleshooting Guide

## 🔧 **Fixed Issues**

### **1. Document Save Endpoint**
- **Problem**: Text editor couldn't save documents properly
- **Solution**: Backend already has complete CRUD endpoints in `backend/src/routes/documents.js`
- **Endpoints Available**:
  - `POST /api/documents` - Create new document
  - `PUT /api/documents/:id` - Save/update document
  - `DELETE /api/documents/:id` - Delete document

### **2. WebSocket Integration**
- **Problem**: TextEditor was using Y.js WebSocket provider instead of backend's Socket.IO
- **Solution**: Updated TextEditor to use backend's Socket.IO service
- **Changes Made**:
  - Replaced Y.js with Socket.IO client
  - Updated collaboration components
  - Integrated with backend's WebSocket service

### **3. API Configuration**
- **Problem**: Hardcoded API URLs in TextEditor
- **Solution**: Updated to use centralized configuration from `frontend/src/config/api.js`

## 🚀 **How to Start the Servers**

### **Option 1: Use the Startup Script**
```bash
node start-backend.js
```

### **Option 2: Start Manually**
```bash
# Terminal 1 - Backend (includes Socket.IO)
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

## 🔍 **Troubleshooting Steps**

### **1. Check Server Status**
```bash
# Check if backend is running
curl http://localhost:5000/health

# Check if Socket.IO is working
curl http://localhost:5000
```

### **2. Check Environment Variables**
Make sure you have these environment variables set:

**Backend (.env)**:
```env
DB_HOST=localhost
DB_USER=your_user
DB_PASS=your_password
JWT_SECRET=your_secret
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env)**:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=http://localhost:5000
```

### **3. Check Database Connection**
```bash
# Test database connection
cd backend
npm run db:migrate
```

### **4. Check Socket.IO Connection**
Open browser console and look for:
- Socket.IO connection messages
- Authentication errors
- Document collaboration events

## 🐛 **Common Issues & Solutions**

### **Issue: "Failed to save document"**
**Causes**:
1. Backend server not running
2. Missing authentication token
3. Database connection issues
4. Document permissions

**Solutions**:
1. Ensure backend is running on port 5000
2. Check if user is logged in
3. Verify database connection
4. Check browser network tab for errors

### **Issue: Socket.IO connection failed**
**Causes**:
1. Backend server not running
2. Authentication token issues
3. CORS configuration
4. Network connectivity

**Solutions**:
1. Start backend server: `cd backend && npm run dev`
2. Check authentication token in localStorage
3. Verify CORS configuration in backend
4. Check browser console for connection errors

### **Issue: Document not loading**
**Causes**:
1. Document doesn't exist
2. User doesn't have permission
3. Database query errors
4. Authentication issues

**Solutions**:
1. Check if document ID is valid
2. Verify user ownership
3. Check database logs
4. Ensure valid authentication token

### **Issue: Real-time collaboration not working**
**Causes**:
1. Socket.IO not connected
2. Authentication issues
3. Document room not joined
4. Multiple users not connected

**Solutions**:
1. Check Socket.IO status in browser console
2. Verify authentication token
3. Check if document room is joined
4. Test with multiple browser tabs

## 📊 **Debug Information**

### **Backend Logs**
Look for these log messages:
```
✅ Database connected successfully
✅ Database synchronized
🚀 Server running on port 5000
🔄 New client connected: [socket-id] User: [username]
```

### **Frontend Console**
Check for these messages:
```
Socket.IO connected
Document joined: [document-id]
Changes received from other user
```

### **Network Tab**
Check for these requests:
- `GET /api/documents/[id]` - Load document
- `PUT /api/documents/[id]` - Save document
- WebSocket connection to `ws://localhost:5000`

## 🔧 **Manual Testing**

### **Test Document Save**
1. Open text editor
2. Make changes
3. Click save button
4. Check browser network tab for PUT request
5. Verify response is successful

### **Test Socket.IO Connection**
1. Open browser console
2. Look for Socket.IO connection messages
3. Check if status shows "connected"
4. Test collaboration with multiple tabs

### **Test Auto-save**
1. Make changes to document
2. Wait 2 seconds
3. Check if auto-save triggers
4. Verify unsaved changes indicator

### **Test Real-time Collaboration**
1. Open document in two browser tabs
2. Make changes in one tab
3. Check if changes appear in the other tab
4. Verify user count updates

## 📞 **Getting Help**

If you're still experiencing issues:

1. **Check the logs** - Look at backend console output
2. **Browser console** - Check for JavaScript errors
3. **Network tab** - Look for failed API requests
4. **Database** - Verify data is being saved correctly
5. **Socket.IO** - Check WebSocket connection status

## ✅ **Verification Checklist**

- [ ] Backend server running on port 5000
- [ ] Frontend running on port 3000
- [ ] Database connected and synchronized
- [ ] User authenticated with valid token
- [ ] Document exists and user has permission
- [ ] Socket.IO connection established
- [ ] Document room joined successfully
- [ ] Save functionality working
- [ ] Auto-save working
- [ ] Real-time collaboration working

## 🔄 **Architecture Overview**

```
Frontend (React) ←→ Backend (Express + Socket.IO) ←→ Database (MySQL)
     ↓                    ↓                           ↓
TextEditor         WebSocket Service            Document Storage
Socket.IO Client   Real-time Updates           User Management
```

The text editor now uses the correct backend structure with Socket.IO for real-time collaboration! 