require("dotenv").config();
const fetch = require('node-fetch');

// Test the shared endpoint
async function testSharedEndpoint() {
  try {
    console.log('🧪 Testing shared endpoint...');
    
    // First, let's share an item
    const shareResponse = await fetch('http://localhost:5000/files/1/share', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // This will fail auth, but we can see the endpoint is working
      },
      body: JSON.stringify({
        userIds: [],
        emails: ['test@example.com']
      })
    });
    
    console.log('Share response status:', shareResponse.status);
    
    // Now test the shared endpoint
    const sharedResponse = await fetch('http://localhost:5000/shared', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log('Shared endpoint response status:', sharedResponse.status);
    
    if (sharedResponse.ok) {
      const data = await sharedResponse.json();
      console.log('Shared items:', data);
    } else {
      console.log('Shared endpoint error:', sharedResponse.status, sharedResponse.statusText);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testSharedEndpoint(); 