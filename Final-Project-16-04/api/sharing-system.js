// Simple in-memory sharing system
// In a production app, this would be stored in a database

class SharingSystem {
  constructor() {
    this.shares = new Map(); // item_type:item_id -> array of shares
  }

  // Share an item with users/emails
  shareItem(itemType, itemId, sharedBy, userIds = [], emails = []) {
    const key = `${itemType}:${itemId}`;
    const existingShares = this.shares.get(key) || [];
    
    console.log(`🔗 Sharing ${itemType} ${itemId} with:`, { userIds, emails });
    console.log(`📋 Existing shares for ${key}:`, existingShares);
    
    const newShares = [];
    
    // Add user IDs
    userIds.forEach(userId => {
      if (!existingShares.some(s => s.type === 'user' && s.value === userId)) {
        newShares.push({
          type: 'user',
          value: userId,
          shared_by: sharedBy,
          shared_at: new Date()
        });
      }
    });
    
    // Add emails
    emails.forEach(email => {
      if (!existingShares.some(s => s.type === 'email' && s.value === email)) {
        newShares.push({
          type: 'email',
          value: email,
          shared_by: sharedBy,
          shared_at: new Date()
        });
      }
    });
    
    this.shares.set(key, [...existingShares, ...newShares]);
    
    console.log(`✅ ${itemType} ${itemId} now shared with:`, this.shares.get(key));
    
    return {
      message: `${itemType} shared successfully`,
      shared_with: [...userIds, ...emails],
      total_shares: this.shares.get(key).length
    };
  }

  // Get shares for an item
  getItemShares(itemType, itemId) {
    const key = `${itemType}:${itemId}`;
    return this.shares.get(key) || [];
  }

  // Get items shared with a user (by user ID or email)
  getSharedItems(userId, userEmail) {
    console.log(`🔍 Looking for items shared with user ${userId} or email ${userEmail}`);
    console.log(`📊 Current shares in system:`, Array.from(this.shares.entries()));
    
    const sharedItems = {
      files: [],
      documents: []
    };
    
    for (const [key, shares] of this.shares.entries()) {
      const [itemType, itemId] = key.split(':');
      
      // Check if this item is shared with the user
      const isShared = shares.some(share => 
        (share.type === 'user' && share.value === userId) ||
        (share.type === 'email' && share.value === userEmail)
      );
      
      console.log(`🔍 Checking ${key}:`, { itemType, itemId, isShared, shares });
      
      if (isShared) {
        if (itemType === 'file') {
          // For files, try to parse as integer, but keep as string if it fails
          const fileId = isNaN(parseInt(itemId)) ? itemId : parseInt(itemId);
          sharedItems.files.push(fileId);
        } else if (itemType === 'document') {
          // For documents, keep as string (UUID)
          sharedItems.documents.push(itemId);
        }
      }
    }
    
    console.log(`📋 Final shared items for user:`, sharedItems);
    return sharedItems;
  }

  // Check if an item is shared with a user
  isItemSharedWith(itemType, itemId, userId, userEmail) {
    const key = `${itemType}:${itemId}`;
    const shares = this.shares.get(key) || [];
    
    return shares.some(share => 
      (share.type === 'user' && share.value === userId) ||
      (share.type === 'email' && share.value === userEmail)
    );
  }
}

module.exports = new SharingSystem(); 