import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { View, Platform, StatusBar, StyleSheet, Image } from 'react-native';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { useEffect, useState } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';

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

    const [isAppReady, setIsAppReady] = useState(false);
    const splashOpacity = useSharedValue(1);
    const appRotateY = useSharedValue(60); // Start rotated
    const appOpacity = useSharedValue(0);
    const appScale = useSharedValue(0.9);

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
            // Hide native splash immediately, our JS splash takes over
            SplashScreen.hideAsync();

            // Start Animation (Metro "Turnstile" / "Swivel" Entry)
            // 1. Splash fades out slightly
            // 2. App rotates in from the "back"

            splashOpacity.value = withTiming(0, { duration: 600, easing: Easing.out(Easing.cubic) }, () => {
                runOnJS(setIsAppReady)(true);
            });

            appRotateY.value = withTiming(0, { duration: 800, easing: Easing.out(Easing.cubic) });
            appOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) });
            appScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
        }
    }, [fontsLoaded]);

    const animatedSplashStyle = useAnimatedStyle(() => ({
        opacity: splashOpacity.value,
    }));

    const animatedAppStyle = useAnimatedStyle(() => ({
        opacity: appOpacity.value,
        transform: [
            { perspective: 1000 },
            { rotateY: `${appRotateY.value}deg` },
            { scale: appScale.value }
        ] as any
    }));

    if (!fontsLoaded && !isAppReady) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000' }}>
            <ErrorBoundary>
                <View style={{ flex: 1, backgroundColor: Colors.background }}>
                    <StatusBarBackground />
                    <NavigationBarBackground />
                    <ExpoStatusBar style="light" />

                    {/* Main App Content - Animates In */}
                    <Animated.View style={[{ flex: 1 }, animatedAppStyle]}>
                        <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
                            <Stack.Screen name="index" />
                        </Stack>
                    </Animated.View>

                    {/* Custom Splash Overlay - Fades Out */}
                    {!isAppReady && (
                        <Animated.View
                            style={[
                                StyleSheet.absoluteFill,
                                { backgroundColor: '#23559F', alignItems: 'center', justifyContent: 'center', zIndex: 10000 },
                                animatedSplashStyle
                            ]}
                        >
                            {/* Splash Icon */}
                            <Animated.Image
                                source={require('../assets/splash-icon.png')}
                                style={{ width: 680, height: 680, resizeMode: 'contain' }}
                            />
                        </Animated.View>
                    )}
                </View>
            </ErrorBoundary>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    splashContainer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#23559F',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
