import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

export type UnitsType = 'metric' | 'imperial' | 'imperial_uk';

const UNITS_KEY = 'metro_maps_units';
const LAST_REGION_KEY = 'metro_maps_last_region';

// Countries that use imperial UK (miles with UK standards)
const UK_COUNTRIES = ['GB', 'UK'];

// Countries that use US imperial (miles with US standards)
const US_COUNTRIES = ['US'];

// Get default units based on user's locale
function getDefaultUnits(): UnitsType {
    const region = Localization.getLocales()?.[0]?.regionCode || '';

    if (UK_COUNTRIES.includes(region)) {
        return 'imperial_uk';
    }
    if (US_COUNTRIES.includes(region)) {
        return 'imperial';
    }
    // Most countries use metric
    return 'metric';
}

export const SettingsService = {
    // Get the user's preferred units (or auto-detect if not set)
    async getUnits(): Promise<UnitsType> {
        try {
            const savedUnits = await AsyncStorage.getItem(UNITS_KEY);
            if (savedUnits && ['metric', 'imperial', 'imperial_uk'].includes(savedUnits)) {
                return savedUnits as UnitsType;
            }
            // No saved preference, use locale-based default
            return getDefaultUnits();
        } catch (e) {
            console.error('Failed to load units preference', e);
            return getDefaultUnits();
        }
    },

    // Save the user's preferred units
    async setUnits(units: UnitsType): Promise<void> {
        try {
            await AsyncStorage.setItem(UNITS_KEY, units);
        } catch (e) {
            console.error('Failed to save units preference', e);
        }
    },

    // Get the default units based on locale (for display purposes)
    getLocaleDefaultUnits(): UnitsType {
        return getDefaultUnits();
    },

    // Get the last saved map region
    async getLastRegion(): Promise<any | null> {
        try {
            const jsonValue = await AsyncStorage.getItem(LAST_REGION_KEY);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (e) {
            console.error('Failed to load last region', e);
            return null;
        }
    },

    // Save the map region
    async setLastRegion(region: any): Promise<void> {
        try {
            await AsyncStorage.setItem(LAST_REGION_KEY, JSON.stringify(region));
        } catch (e) {
            console.error('Failed to save last region', e);
        }
    }
};
