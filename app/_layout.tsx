import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { View, Platform, StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SetupScreen } from '../components/SetupScreen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/ErrorBoundary';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, OpenSans_300Light, OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import '../locales/i18n';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { FontProvider } from '../contexts/FontContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function StatusBarBackground() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    return (
        <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: colors.background,
            zIndex: 9999
        }} />
    );
}

function NavigationBarBackground() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    return (
        <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: insets.bottom,
            backgroundColor: colors.background,
            zIndex: 9999
        }} />
    );
}

function AppContent() {
    const { colors, isDark } = useTheme();
    const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

    useEffect(() => {
        async function checkApiKey() {
            try {
                const setupComplete = await AsyncStorage.getItem('SETUP_COMPLETE');
                if (setupComplete === 'true') {
                    setHasApiKey(true);
                } else {
                    setHasApiKey(false);
                }
            } catch (e) {
                setHasApiKey(false);
            }
        }
        checkApiKey();
    }, []);

    useEffect(() => {
        // Lock to portrait
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

        // Configure System Navigation Bar (Android)
        if (Platform.OS === 'android') {
            NavigationBar.setBackgroundColorAsync(colors.background);
            NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");
            StatusBar.setBackgroundColor(colors.background);
            StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content');
        }
    }, [isDark, colors]);

    if (hasApiKey === null) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
            <ErrorBoundary>
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <StatusBarBackground />
                    <NavigationBarBackground />
                    <ExpoStatusBar style={isDark ? "light" : "dark"} />

                    {!hasApiKey ? (
                        <SetupScreen onComplete={() => setHasApiKey(true)} />
                    ) : (
                        <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
                            <Stack.Screen name="index" />
                        </Stack>
                    )}
                </View>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}

export default function RootLayout() {
    const [fontsLoaded] = useFonts({
        OpenSans_300Light,
        OpenSans_400Regular,
        OpenSans_600SemiBold,
        OpenSans_700Bold,
    });

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <ThemeProvider>
            <FontProvider>
                <AppContent />
            </FontProvider>
        </ThemeProvider>
    );
}
