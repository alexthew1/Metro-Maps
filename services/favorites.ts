import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchResult } from './api';

const FAVORITES_KEY = '@metromaps_favorites';

export type Favorite = SearchResult & { alias?: string };

export const FavoritesService = {
    // Get all favorites
    async getFavorites(): Promise<Favorite[]> {
        try {
            const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : [];
        } catch (e) {
            console.error('Failed to load favorites', e);
            return [];
        }
    },

    // Add a favorite
    async addFavorite(place: SearchResult, alias?: string): Promise<void> {
        try {
            const favorites = await this.getFavorites();
            // Avoid duplicates, but allow updating alias if exists?
            // Ideally if it exists, we might want to just update the alias.
            const existingIndex = favorites.findIndex(f => f.place_id === place.place_id);

            let newFavorites;
            if (existingIndex >= 0) {
                // Update existing
                const updated = { ...favorites[existingIndex], alias: alias || favorites[existingIndex].alias };
                newFavorites = [...favorites];
                newFavorites[existingIndex] = updated;
            } else {
                // Add new
                const newFav: Favorite = { ...place, alias };
                newFavorites = [...favorites, newFav];
            }

            await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
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
    },

    // Get specific favorite
    async getFavorite(placeId: string): Promise<Favorite | undefined> {
        const favorites = await this.getFavorites();
        return favorites.find(f => f.place_id === placeId);
    }
};
