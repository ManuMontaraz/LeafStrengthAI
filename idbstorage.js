/**
 * IDBStorage - IndexedDB wrapper that works like localStorage
 * Database name: "idb"
 * Object store: "storage"
 */
class IDBStorage {
    constructor() {
        this.dbName = 'idb';
        this.storeName = 'storage';
        this.db = null;
        this.version = 1;
        this._initPromise = null;
    }

    /**
     * Initialize the database connection
     * @returns {Promise<void>}
     */
    async init() {
        if (this._initPromise) {
            return this._initPromise;
        }

        this._initPromise = new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB is not supported in this browser'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error(`Failed to open database: ${request.error?.message || 'Unknown error'}`));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });

        return this._initPromise;
    }

    /**
     * Ensure database is initialized before operations
     */
    async _ensureInit() {
        if (!this.db) {
            await this.init();
        }
    }

    /**
     * Store a key-value pair
     * @param {string} key - The key to store
     * @param {string} value - The value to store (must be a string)
     * @returns {Promise<void>}
     * @throws {Error} If value is not a string
     */
    async setItem(key, value) {
        await this._ensureInit();

        if (typeof value !== 'string') {
            throw new Error('IDBStorage: value must be a string');
        }

        if (typeof key !== 'string') {
            throw new Error('IDBStorage: key must be a string');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.put(value, key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error(`Failed to set item: ${request.error?.message || 'Unknown error'}`));
            };

            transaction.onerror = () => {
                reject(new Error(`Transaction failed: ${transaction.error?.message || 'Unknown error'}`));
            };
        });
    }

    /**
     * Retrieve a value by key
     * @param {string} key - The key to retrieve
     * @returns {Promise<string|null>} The value or null if not found
     */
    async getItem(key) {
        await this._ensureInit();

        if (typeof key !== 'string') {
            throw new Error('IDBStorage: key must be a string');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.get(key);

            request.onsuccess = () => {
                // Return null if key doesn't exist
                resolve(request.result !== undefined ? request.result : null);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get item: ${request.error?.message || 'Unknown error'}`));
            };
        });
    }

    /**
     * Remove a key-value pair
     * @param {string} key - The key to remove
     * @returns {Promise<void>}
     */
    async removeItem(key) {
        await this._ensureInit();

        if (typeof key !== 'string') {
            throw new Error('IDBStorage: key must be a string');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.delete(key);

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error(`Failed to remove item: ${request.error?.message || 'Unknown error'}`));
            };
        });
    }

    /**
     * Clear all items from the store
     * @returns {Promise<void>}
     */
    async clear() {
        await this._ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.clear();

            request.onsuccess = () => {
                resolve();
            };

            request.onerror = () => {
                reject(new Error(`Failed to clear store: ${request.error?.message || 'Unknown error'}`));
            };
        });
    }

    /**
     * Get all keys from the store
     * @returns {Promise<string[]>} Array of keys
     */
    async keys() {
        await this._ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.getAllKeys();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(new Error(`Failed to get keys: ${request.error?.message || 'Unknown error'}`));
            };
        });
    }

    /**
     * Get the number of items in the store
     * @returns {Promise<number>}
     */
    async length() {
        await this._ensureInit();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            
            const request = store.count();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                reject(new Error(`Failed to count items: ${request.error?.message || 'Unknown error'}`));
            };
        });
    }

    /**
     * Close the database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this._initPromise = null;
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IDBStorage;
}
