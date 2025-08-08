// Simple request cache to prevent duplicate API calls
class RequestCache {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
  }

  // Generate cache key from URL and headers
  getCacheKey(url, options = {}) {
    const key = `${url}_${JSON.stringify(options.headers || {})}`;
    return key;
  }

  // Get cached response if available and not expired
  get(url, options = {}, ttl = 5000) { // 5 second default TTL
    const key = this.getCacheKey(url, options);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    
    return null;
  }

  // Set cache entry
  set(url, options = {}, data) {
    const key = this.getCacheKey(url, options);
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });

    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanup();
    }
  }

  // Get or create a pending request
  async getOrFetch(url, options = {}, ttl = 5000) {
    // Check cache first
    const cached = this.get(url, options, ttl);
    if (cached) {
      return cached;
    }

    const key = this.getCacheKey(url, options);
    
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Make new request
    const requestPromise = fetch(url, options)
      .then(response => {
        if (response.ok) {
          return response.json().then(data => {
            this.set(url, options, data);
            return data;
          });
        }
        throw new Error(`HTTP ${response.status}`);
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  // Clean up old cache entries
  cleanup() {
    const now = Date.now();
    const maxAge = 300000; // 5 minutes

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

// Export singleton instance
export const requestCache = new RequestCache();

// Helper function for cached fetch
export const cachedFetch = (url, options = {}, ttl = 5000) => {
  return requestCache.getOrFetch(url, options, ttl);
};

export default RequestCache;