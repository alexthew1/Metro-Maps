import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchResult } from './api';

const FAVORITES_KEY = '@metromaps_favorites';

export const FavoritesService = {
    // Get all favorites
    async getFavorites(): Promise<SearchResult[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load favorites', e);
            return [];
        }
    },

    // Add a favorite
    async addFavorite(place: SearchResult): Promise<void> {
        try {
            const favorites = await this.getFavorites();
            // Avoid duplicates
            if (!favorites.some(f => f.place_id === place.place_id)) {
                const newFavorites = [...favorites, place];
                await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
            }
        } catch (e) {
            console.error('Failed to add favorite', e);
        }
    },

    // Remove a favorite
    async removeFavorite(placeId: string): Promise<void> {
        try {
            const favorites = await this.getFavorites();
            const newFavorites = favorites.filter(f => f.place_id !== placeId);
            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
        } catch (e) {
            console.error('Failed to remove favorite', e);
        }
    },

    // Check if is favorite
    async isFavorite(placeId: string): Promise<boolean> {
        const favorites = await this.getFavorites();
        return favorites.some(f => f.place_id === placeId);
    }
};
