require("dotenv").config();
const sharingSystem = require('./sharing-system');

// Test the sharing system
console.log('🧪 Testing sharing system...');

// Test 1: Share a file
console.log('\n📄 Test 1: Sharing a file');
const shareResult = sharingSystem.shareItem('file', 1, 1, [], ['test@example.com']);
console.log('Share result:', shareResult);

// Test 2: Get shared items for a user
console.log('\n🔍 Test 2: Getting shared items');
const sharedItems = sharingSystem.getSharedItems(1, 'test@example.com');
console.log('Shared items:', sharedItems);

// Test 3: Check if item is shared
console.log('\n✅ Test 3: Checking if item is shared');
const isShared = sharingSystem.isItemSharedWith('file', 1, 1, 'test@example.com');
console.log('Is shared:', isShared);

console.log('\n✅ Sharing system test completed!'); 