import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Generic storage service for ProjectFy
 * Handles JSON serialization/deserialization and basic CRUD operations
 */
export const storageService = {
    /**
     * Save data to storage
     */
    save: async <T>(key: string, value: T): Promise<void> => {
        try {
            const jsonValue = JSON.stringify(value);
            await AsyncStorage.setItem(key, jsonValue);
        } catch (e) {
            console.error(`Error saving data for key ${key}:`, e);
            throw e;
        }
    },

    /**
     * Get data from storage
     */
    get: async <T>(key: string): Promise<T | null> => {
        try {
            const jsonValue = await AsyncStorage.getItem(key);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (e) {
            console.error(`Error getting data for key ${key}:`, e);
            throw e;
        }
    },

    /**
     * Remove data from storage
     */
    remove: async (key: string): Promise<void> => {
        try {
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.error(`Error removing data for key ${key}:`, e);
            throw e;
        }
    },

    /**
     * Add an item to an array in storage
     */
    addItemToArray: async <T>(key: string, item: T): Promise<void> => {
        try {
            const existingData = await storageService.get<T[]>(key) || [];
            const newData = [...existingData, item];
            await storageService.save(key, newData);
        } catch (e) {
            console.error(`Error adding item to array for key ${key}:`, e);
            throw e;
        }
    },

    /**
     * Update an item in an array in storage
     */
    updateItemInArray: async <T extends { id: string }>(key: string, updatedItem: T): Promise<void> => {
        try {
            const existingData = await storageService.get<T[]>(key) || [];
            const newData = existingData.map(item => item.id === updatedItem.id ? updatedItem : item);
            await storageService.save(key, newData);
        } catch (e) {
            console.error(`Error updating item in array for key ${key}:`, e);
            throw e;
        }
    },

    /**
     * Remove an item from an array in storage
     */
    removeItemFromArray: async <T extends { id: string }>(key: string, itemId: string): Promise<void> => {
        try {
            const existingData = await storageService.get<T[]>(key) || [];
            const newData = existingData.filter(item => item.id !== itemId);
            await storageService.save(key, newData);
        } catch (e) {
            console.error(`Error removing item from array for key ${key}:`, e);
            throw e;
        }
    },

    /**
     * Clear all data (use with caution)
     */
    clearAll: async (): Promise<void> => {
        try {
            await AsyncStorage.clear();
        } catch (e) {
            console.error('Error clearing storage:', e);
            throw e;
        }
    }
};
