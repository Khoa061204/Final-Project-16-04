# Y.js WebSocket Service

This service provides real-time collaboration capabilities for CloudSync documents using Y.js and WebSocket.

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
```

### Start the Service
```bash
npm start
```

### Development Mode
```bash
npm run dev
```

## 🔧 Configuration

### Environment Variables
- `WS_PORT`: WebSocket server port (default: 1234)

### Example .env file
```env
WS_PORT=1234
```

## 📡 WebSocket Endpoints

### Document Collaboration
- **URL**: `ws://localhost:1234`
- **Protocol**: Y.js WebSocket
- **Usage**: Used by the TextEditor component for real-time document collaboration

### Health Check
- **URL**: `http://localhost:1234`
- **Response**: "Y.js WebSocket server is running"

## 🔗 Integration

This service works alongside the main CloudSync backend:

- **Backend API**: `http://localhost:5000` (Socket.IO for general app communication)
- **Y.js WebSocket**: `ws://localhost:1234` (Document collaboration)
- **Frontend**: `http://localhost:3000` (React app)

## 🛠️ Architecture

### Components
- **WebSocket Server**: Handles Y.js document collaboration
- **HTTP Server**: Provides health check endpoint
- **CORS Support**: Allows cross-origin requests
- **Error Handling**: Graceful error handling and logging

### Features
- ✅ Real-time document collaboration
- ✅ Multi-user editing
- ✅ Cursor tracking
- ✅ Change synchronization
- ✅ Automatic reconnection
- ✅ Health monitoring

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using port 1234
lsof -i :1234

# Kill the process if needed
kill -9 <PID>
```

#### 2. WebSocket Connection Failed
- Ensure the service is running: `npm start`
- Check the port is correct: `http://localhost:1234`
- Verify CORS settings in the frontend

#### 3. Y.js Not Working
- Check browser console for errors
- Verify WebSocket URL in TextEditor component
- Ensure all dependencies are installed

### Debug Commands

#### Check Service Status
```bash
curl http://localhost:1234
# Should return: "Y.js WebSocket server is running"
```

#### Monitor Logs
```bash
npm run dev
# Watch for connection and error messages
```

## 📊 Performance

### Optimization Tips
- Use WebSocket compression for large documents
- Implement rate limiting for frequent updates
- Monitor memory usage with many concurrent users
- Consider clustering for high-traffic scenarios

### Monitoring
- Connection count
- Document collaboration sessions
- Error rates
- Response times

## 🔒 Security

### Best Practices
- Implement authentication for document access
- Validate document IDs and user permissions
- Rate limit connections per user
- Monitor for suspicious activity

### Future Enhancements
- JWT authentication integration
- Document access control
- Encryption for sensitive documents
- Audit logging

## 📝 Development

### Adding Features
1. Modify `server.js` for new WebSocket handlers
2. Update package.json for new dependencies
3. Test with multiple browser tabs
4. Update documentation

### Testing
```bash
# Test WebSocket connection
wscat -c ws://localhost:1234

# Test health endpoint
curl http://localhost:1234
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details 