import 'dotenv/config';

export default {
    expo: {
        name: "MetroMaps",
        slug: "metromaps",
        version: "1.3.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        newArchEnabled: true,
        splash: {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#23559F"
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
                    "backgroundColor": "#23559F",
                    "image": "./assets/splash-icon.png",
                    "dark": {
                        "image": "./assets/splash-icon-dark.png",
                        "backgroundColor": "#23559F"
                    },
                    "imageWidth": 680
                }
            ]
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
                    apiKey: process.env.GOOGLE_MAPS_API_KEY || ""
                }
            }
        },
        extra: {
            router: {},
            eas: {
                projectId: "b469ad27-1d33-414f-9884-55427dd59992"
            },
            // Expose API key to app via expo-constants
            googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
        },
        owner: "alexthews-organization"
    }
};
