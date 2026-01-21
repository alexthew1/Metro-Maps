import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { View, Platform, StatusBar, StyleSheet } from 'react-native';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/ErrorBoundary';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, OpenSans_300Light, OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

function StatusBarBackground() {
    const insets = useSafeAreaInsets();
    return (
        <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: 'black',
            zIndex: 9999
        }} />
    );
}

function NavigationBarBackground() {
    const insets = useSafeAreaInsets();
    return (
        <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: insets.bottom,
            backgroundColor: 'black',
            zIndex: 9999
        }} />
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
        // Lock to portrait
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

        // Configure System Navigation Bar (Android)
        if (Platform.OS === 'android') {
            NavigationBar.setBackgroundColorAsync("black");
            NavigationBar.setButtonStyleAsync("light");
            StatusBar.setBackgroundColor('black');
            StatusBar.setBarStyle('light-content');
        }
    }, []);

    useEffect(() => {
        if (fontsLoaded) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
            <ErrorBoundary>
                <View style={{ flex: 1, backgroundColor: Colors.background }}>
                    <StatusBarBackground />
                    <NavigationBarBackground />
                    <ExpoStatusBar style="light" />

                    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
                        <Stack.Screen name="index" />
                    </Stack>
                </View>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}
