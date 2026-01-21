import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchResult } from './api';

const RECENTS_KEY = 'metro_maps_recents';
const MAX_RECENTS = 10;

export const RecentsService = {
    // Get all recents
    async getRecents(): Promise<SearchResult[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(RECENTS_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load recents', e);
            return [];
        }
    },

    // Add a recent place
    async addRecent(place: SearchResult): Promise<void> {
        try {
            const recents = await this.getRecents();

            // Remove if already exists (to bump to top)
            const filtered = recents.filter(r => r.place_id !== place.place_id);

            // Add to top
            const newRecents = [place, ...filtered].slice(0, MAX_RECENTS);

            await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(newRecents));
        } catch (e) {
            console.error('Failed to add recent', e);
        }
    },

    // Clear all
    async clearRecents(): Promise<void> {
        try {
            await AsyncStorage.removeItem(RECENTS_KEY);
        } catch (e) {
            console.error('Failed to clear recents', e);
        }
    }
};
