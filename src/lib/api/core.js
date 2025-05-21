// Core API utility functions for making backend requests

//const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
// const API_BASE_URL = "https://testing-agent-app-pkru6.ondigitalocean.app/api" // Old absolute URL
const API_BASE_URL = "/api"; // Use relative path for proxy

// Enhanced cache configuration with tiered approach
const CACHE_DURATIONS = {
  DEFAULT: 60000,         // 1 minute for most data
  SHORT: 30000,           // 30 seconds for rapidly changing data
  MEDIUM: 300000,         // 5 minutes for relatively stable data
  LONG: 3600000,          // 1 hour for very stable data
  PERSISTENT: 86400000    // 24 hours for reference data
};

// Cache storage options
const CACHE_STORAGE = {
  MEMORY: 'memory',      // Fast but cleared on page refresh
  LOCAL: 'localStorage',  // Persists across sessions but limited size
  INDEXED_DB: 'indexedDB' // Best for large data, persists across sessions
};

// Memory cache
const apiCache = new Map();
const pendingRequests = new Map();

// IndexedDB setup for persistent caching
let dbPromise = null;

// Initialize IndexedDB
function initIndexedDB() {
  if (!dbPromise && window.indexedDB) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('apiCache', 1);
      
      request.onerror = (event) => {
        console.error('IndexedDB error:', event);
        reject('IndexedDB not available');
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('responses')) {
          const store = db.createObjectStore('responses', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
    });
  }
  return dbPromise;
}

// Save response to IndexedDB
async function saveToIndexedDB(key, data) {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['responses'], 'readwrite');
      const store = transaction.objectStore('responses');
      
      const item = {
        id: key,
        data: data,
        timestamp: Date.now()
      };
      
      const request = store.put(item);
      
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e);
    });
  } catch (error) {
    console.error('Error saving to IndexedDB:', error);
    return false;
  }
}

// Get response from IndexedDB
async function getFromIndexedDB(key, maxAge) {
  try {
    const db = await initIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['responses'], 'readonly');
      const store = transaction.objectStore('responses');
      const request = store.get(key);
      
      request.onsuccess = (event) => {
        const result = event.target.result;
        if (result && (Date.now() - result.timestamp) < maxAge) {
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = (e) => reject(e);
    });
  } catch (error) {
    console.error('Error reading from IndexedDB:', error);
    return null;
  }
}

// Clear old cache entries from IndexedDB
async function pruneIndexedDBCache(maxAge = 86400000) { // Default: 24 hours
  try {
    const db = await initIndexedDB();
    const cutoffTime = Date.now() - maxAge;
    
    const transaction = db.transaction(['responses'], 'readwrite');
    const store = transaction.objectStore('responses');
    const index = store.index('timestamp');
    
    const range = IDBKeyRange.upperBound(cutoffTime);
    const request = index.openCursor(range);
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  } catch (error) {
    console.error('Error pruning IndexedDB cache:', error);
  }
}

// Simplified logging for production
const isProduction = process.env.NODE_ENV === "production";
const logRequest = (method, url, body) => {
  if (!isProduction) {
    console.log(`API Request: ${method || "GET"} ${url}`);
    if (body) console.log("Request body:", body);
  }
};

const logResponse = (status, statusText, data) => {
  if (!isProduction) {
    console.log(`API Response status: ${status} ${statusText}`);
    console.log("API Response data:", data);
  }
};

const logError = (endpoint, error) => {
  console.error(`API Error (${endpoint}):`, error);
};

// Request optimization - batch similar requests within a time window
const requestBatches = new Map();

function batchRequests(endpoint, options, callback, batchWindowMs = 50) {
  const batchKey = `${options.method || 'GET'}:${endpoint}`;
  
  if (!requestBatches.has(batchKey)) {
    // Create a new batch
    const batch = {
      callbacks: [callback],
      timer: setTimeout(() => {
        // Process batch
        const callbacks = requestBatches.get(batchKey).callbacks;
        requestBatches.delete(batchKey);
        
        // Execute the actual request
        fetchAPI(endpoint, options, true, 'DEFAULT', CACHE_STORAGE.MEMORY)
          .then(result => callbacks.forEach(cb => cb(null, result)))
          .catch(error => callbacks.forEach(cb => cb(error, null)));
      }, batchWindowMs)
    };
    
    requestBatches.set(batchKey, batch);
  } else {
    // Add to existing batch
    requestBatches.get(batchKey).callbacks.push(callback);
  }
}

// Enhanced fetch wrapper with multi-tier caching and request optimization
export async function fetchAPI(
  endpoint,
  options = {},
  useCache = true,
  cacheDurationType = 'DEFAULT',
  cacheStorage = CACHE_STORAGE.MEMORY,
  batchSimilarRequests = false
) {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = options.method || "GET";
  const cacheDuration = CACHE_DURATIONS[cacheDurationType] || CACHE_DURATIONS.DEFAULT;

  // Only cache GET requests
  const shouldUseCache = useCache && method === "GET";

  // Create a cache key based on the URL and request body
  const cacheKey = `${method}:${url}:${options.body || ""}`;

  // Support for request batching (for identical requests within a short time window)
  if (batchSimilarRequests && method === "GET") {
    return new Promise((resolve, reject) => {
      batchRequests(endpoint, options, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }

  // Try to get from cache based on the selected storage strategy
  if (shouldUseCache) {
    // Check memory cache first (fastest)
    const memoryCachedResponse = apiCache.get(cacheKey);
    if (memoryCachedResponse && Date.now() - memoryCachedResponse.timestamp < cacheDuration) {
      return memoryCachedResponse.data;
    }
    
    // For persistent cache types, check IndexedDB
    if (cacheStorage === CACHE_STORAGE.INDEXED_DB) {
      const indexedDBResponse = await getFromIndexedDB(cacheKey, cacheDuration);
      if (indexedDBResponse) {
        // Also update memory cache for faster future access
        apiCache.set(cacheKey, {
          data: indexedDBResponse,
          timestamp: Date.now()
        });
        return indexedDBResponse;
      }
    }
    
    // Check localStorage as another fallback
    if (cacheStorage === CACHE_STORAGE.LOCAL) {
      try {
        const storedItem = localStorage.getItem(`api_cache:${cacheKey}`);
        if (storedItem) {
          const { data, timestamp } = JSON.parse(storedItem);
          if (Date.now() - timestamp < cacheDuration) {
            // Also update memory cache
            apiCache.set(cacheKey, { data, timestamp });
            return data;
          }
        }
      } catch (e) {
        console.warn('LocalStorage cache error:', e);
      }
    }
  }

  // Check if there's already a pending request for this exact endpoint
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Log the request (reduced in production)
  logRequest(method, url, options.body);

  // Create the promise for this request
  const requestPromise = (async () => {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      // Log response status (reduced in production)
      logResponse(response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (!isProduction) console.error("API Error response:", errorData);
        throw new Error(errorData.detail || `API Error: ${response.status}`);
      }

      const data = await response.json();

      // Cache successful GET responses
      if (shouldUseCache) {
        // Always update memory cache
        apiCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });
        
        // Update persistent cache if requested
        if (cacheStorage === CACHE_STORAGE.INDEXED_DB) {
          saveToIndexedDB(cacheKey, data);
        } else if (cacheStorage === CACHE_STORAGE.LOCAL) {
          try {
            localStorage.setItem(`api_cache:${cacheKey}`, JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          } catch (e) {
            console.warn('LocalStorage cache write error:', e);
          }
        }
      }

      return data;
    } catch (error) {
      logError(endpoint, error);
      throw error;
    } finally {
      // Remove from pending requests when done
      pendingRequests.delete(cacheKey);
    }
  })();

  // Store the pending request
  pendingRequests.set(cacheKey, requestPromise);

  return requestPromise;
}

// Helper to invalidate cache for specific endpoints
export function invalidateCache(endpointPattern, storageTypes = [CACHE_STORAGE.MEMORY]) {
  // Invalidate memory cache
  if (storageTypes.includes(CACHE_STORAGE.MEMORY)) {
    for (const key of apiCache.keys()) {
      if (key.includes(endpointPattern)) {
        apiCache.delete(key);
      }
    }
  }
  
  // Invalidate localStorage cache
  if (storageTypes.includes(CACHE_STORAGE.LOCAL)) {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('api_cache:') && key.includes(endpointPattern)) {
        localStorage.removeItem(key);
      }
    }
  }
  
  // Invalidate IndexedDB cache (more complex)
  if (storageTypes.includes(CACHE_STORAGE.INDEXED_DB) && dbPromise) {
    dbPromise.then(db => {
      const transaction = db.transaction(['responses'], 'readwrite');
      const store = transaction.objectStore('responses');
      const request = store.openCursor();
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.id.includes(endpointPattern)) {
            store.delete(cursor.value.id);
          }
          cursor.continue();
        }
      };
    }).catch(err => console.error('Error clearing IndexedDB cache:', err));
  }
}

// Periodic cache maintenance - run every hour
if (typeof window !== 'undefined') {
  setInterval(() => {
    pruneIndexedDBCache();
  }, 3600000);
} 