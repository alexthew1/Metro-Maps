// One Android map ID can have published light and dark styles associated with it.
// Optional per-theme IDs override the shared map ID; empty IDs keep embedded styling.
const commonMapId = process.env.EXPO_PUBLIC_ANDROID_MAP_ID || '';
export const CLOUD_MAP_IDS = {
    light: process.env.EXPO_PUBLIC_ANDROID_MAP_ID_LIGHT || commonMapId,
    dark: process.env.EXPO_PUBLIC_ANDROID_MAP_ID_DARK || commonMapId,
};
