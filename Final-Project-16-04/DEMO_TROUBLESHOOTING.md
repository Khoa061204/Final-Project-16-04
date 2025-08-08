# 🚨 **DEMO TROUBLESHOOTING GUIDE**

## 🎯 **Common Issues & Solutions**

### **🔐 Authentication Issues**

#### **Login Not Working**
```
Problem: Can't login with demo accounts
Solution:
1. Check if backend is running: http://localhost:5000/api/health
2. Clear browser cache and cookies
3. Check browser console for errors
4. Verify database connection
```

#### **Token Expired**
```
Problem: "Authentication required" errors
Solution:
1. Logout and login again
2. Check if JWT_SECRET is set in backend .env
3. Verify token expiration time
```

### **📁 File Management Issues**

#### **File Upload Failing**
```
Problem: Files not uploading
Solution:
1. Check AWS S3 credentials in backend .env
2. Verify file size limits (default: 50MB)
3. Check browser console for errors
4. Ensure backend storage service is running
```

#### **File Preview Not Working**
```
Problem: PDF/images not previewing
Solution:
1. Check if file exists in S3
2. Verify CORS settings
3. Check browser console for errors
4. Try refreshing the page
```

### **👥 Team Collaboration Issues**

#### **Teams Not Loading**
```
Problem: Teams page shows loading forever
Solution:
1. Check backend teams endpoint: http://localhost:5000/api/teams
2. Verify database connection
3. Check browser console for errors
4. Clear browser cache
```

#### **Team Chat Not Working**
```
Problem: Messages not sending/receiving
Solution:
1. Check WebSocket connection: ws://localhost:1234
2. Verify Socket.IO service is running
3. Check browser console for WebSocket errors
4. Refresh the page
```

### **✍️ Document Collaboration Issues**

#### **Real-time Editing Not Working**
```
Problem: Changes not syncing between users
Solution:
1. Check WebSocket connection
2. Verify Yjs server is running
3. Check browser console for errors
4. Ensure users are in the same document room
```

#### **Cursor Tracking Not Working**
```
Problem: Can't see other users' cursors
Solution:
1. Check if collaboration is enabled
2. Verify WebSocket connection
3. Check browser console for errors
4. Refresh the page
```

### **📊 Project Management Issues**

#### **Projects Not Loading**
```
Problem: Projects page shows loading forever
Solution:
1. Check backend projects endpoint: http://localhost:5000/api/projects
2. Verify database connection
3. Check browser console for errors
4. Clear browser cache
```

#### **Tasks Not Creating**
```
Problem: Can't create tasks
Solution:
1. Check if user has permissions
2. Verify project exists
3. Check browser console for errors
4. Ensure all required fields are filled
```

---

## 🚀 **Quick Fix Commands**

### **Restart Services**
```bash
# Stop all services
Ctrl+C (in each terminal)

# Start all services
npm run start-all

# Or start individually
npm run start-backend
npm run start-frontend
npm run start-websocket
```

### **Check Service Status**
```bash
# Check if ports are in use
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :1234

# Kill processes if needed
taskkill /PID <PID> /F
```

### **Database Issues**
```bash
# Check database connection
cd backend
node -e "require('./src/config/database.js')"

# Reset database (if needed)
mysql -u root -p final_project < dump-final_project-202507211626.sql
```

---

## 🎯 **Demo Backup Plan**

### **If Real-time Features Fail**
1. **Show Screenshots**: Have screenshots of real-time collaboration
2. **Explain Technology**: Describe how Yjs CRDT works
3. **Focus on UI**: Show the interface and features
4. **Use Pre-recorded Video**: Have a backup video demo

### **If Services Don't Start**
1. **Show Code**: Explain the architecture and code structure
2. **Discuss Features**: Talk about implemented features
3. **Show Documentation**: Present the technical documentation
4. **Explain Challenges**: Discuss technical challenges and solutions

### **If Internet Issues**
1. **Local Demo**: Use localhost if possible
2. **Offline Mode**: Show static screenshots and videos
3. **Code Walkthrough**: Explain the codebase and architecture
4. **Feature Discussion**: Talk about features and implementation

---

## 🎪 **Demo Flow Alternatives**

### **Plan A: Full Interactive Demo**
- All services running
- Real-time collaboration working
- Full feature demonstration

### **Plan B: Partial Demo**
- Core features working
- Some real-time features disabled
- Focus on UI and user experience

### **Plan C: Presentation Mode**
- Screenshots and videos
- Code walkthrough
- Architecture discussion
- Feature explanation

---

## 🎯 **Key Points to Remember**

### **Technical Highlights**
- **Real-time Collaboration**: Yjs CRDT technology
- **Modern Architecture**: Microservices with React/Node.js
- **Scalable Design**: AWS S3, MySQL, WebSocket
- **Security**: JWT authentication, role-based access

### **User Benefits**
- **Unified Platform**: One solution for all collaboration needs
- **Real-time Sync**: Instant collaboration and communication
- **User-Friendly**: Intuitive interface, no training required
- **Scalable**: Grows with your organization

### **Competitive Advantages**
- **Advanced Technology**: Latest web technologies
- **Comprehensive Features**: File, team, project management
- **Performance**: Fast loading, real-time updates
- **Security**: Enterprise-grade security

---

## 🚨 **Emergency Contacts**

### **Technical Support**
- **Backend Issues**: Check backend logs and database
- **Frontend Issues**: Check browser console and network
- **Real-time Issues**: Check WebSocket connection
- **Database Issues**: Check MySQL connection and tables

### **Demo Preparation**
- **Test Everything**: Run full demo flow before presentation
- **Backup Data**: Have sample data ready
- **Multiple Accounts**: Prepare different user accounts
- **Screenshots**: Have backup screenshots ready

---

**Remember: Stay calm, be prepared, and focus on the value your platform provides! 🎯** 