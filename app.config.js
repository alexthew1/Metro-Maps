import 'dotenv/config';

export default {
    expo: {
        name: "MetroMaps",
        slug: "metromaps",
        version: "1.6.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        newArchEnabled: true,
        splash: {
            backgroundColor: "#000000"
        },
        plugins: [
            "expo-router",
            [
                "expo-location",
                {
                    locationAlwaysAndWhenInUsePermission: "Allow MetroMap to access your location."
                }
            ],
            "expo-font",
            "expo-localization",
            [
                "expo-splash-screen",
                {
                    "backgroundColor": "#000000",
                    "image": "./assets/splash-black.png",
                    "imageWidth": 1
                }
            ],
            "expo-build-properties"
        ],
        scheme: "metromap",
        ios: {
            supportsTablet: true,
            bundleIdentifier: "com.metromap.ultimate"
        },
        android: {
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#ffffff"
            },
            edgeToEdgeEnabled: true,
            package: "com.metromap.ultimate",
            permissions: [
                "android.permission.ACCESS_COARSE_LOCATION",
                "android.permission.ACCESS_FINE_LOCATION"
            ],
            config: {
                googleMaps: {
                    apiKey: process.env.EXPO_PUBLIC_RESTRICTED_API_KEY || ""
                }
            }
        },
        extra: {
            router: {},
            eas: {
                projectId: "b469ad27-1d33-414f-9884-55427dd59992"
            },
            // Expose API key to app via expo-constants ONLY in development
            googleMapsApiKey: process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' ? process.env.EXPO_PUBLIC_RESTRICTED_API_KEY : ""
        },
        owner: "alexthews-organization"
    }
};
