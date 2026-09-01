import { Stack } from 'expo-router';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { View, Platform, StatusBar, StyleSheet, useColorScheme, Image, Dimensions } from 'react-native';
import { Colors } from '../constants/Colors';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SetupScreen } from '../components/SetupScreen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/ErrorBoundary';
import * as NavigationBar from 'expo-navigation-bar';
import { useFonts, OpenSans_300Light, OpenSans_400Regular, OpenSans_600SemiBold, OpenSans_700Bold } from '@expo-google-fonts/open-sans';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withDelay,
    Easing,
    runOnJS
} from 'react-native-reanimated';
import '../locales/i18n';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { FontProvider } from '../contexts/FontContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const METRO_EASING = Easing.bezier(0.1, 0.9, 0.2, 1);

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

function MetroProgressDot({ index, color }: { index: number; color: string }) {
    const progress = useSharedValue(-20);

    useEffect(() => {
        progress.value = withRepeat(
            withDelay(
                index * 150,
                withTiming(SCREEN_WIDTH + 20, {
                    duration: 2200,
                    easing: Easing.bezier(0.25, 0.1, 0.25, 1)
                })
            ),
            -1,
            false
        );
    }, [index]);

    const dotStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: progress.value }]
    }));

    return (
        <Animated.View
            style={[
                {
                    position: 'absolute',
                    width: 5,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: color
                },
                dotStyle
            ]}
        />
    );
}

function MetroProgressBar({ color = '#FFFFFF' }: { color?: string }) {
    const dots = [0, 1, 2, 3, 4];
    return (
        <View style={{ width: '100%', height: 6, overflow: 'hidden' }}>
            {dots.map((index) => (
                <MetroProgressDot key={index} index={index} color={color} />
            ))}
        </View>
    );
}

function AnimatedSplashOverlay({ startExit, onFinish }: { startExit: boolean; onFinish: () => void }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const insets = useSafeAreaInsets();
    
    // Windows Phone 3D Flip In on launch
    const rotateY = useSharedValue(90);
    const cardOpacity = useSharedValue(1);
    const backdropOpacity = useSharedValue(1);

    useEffect(() => {
        // 1. Wait 0.3s on black screen after launch, then flip in
        rotateY.value = withDelay(
            300,
            withTiming(0, { duration: 450, easing: METRO_EASING }, (finished) => {
                if (finished) {
                    // Remove black overlay behind splash card once flip-in completes
                    backdropOpacity.value = withTiming(0, { duration: 150 });
                }
            })
        );
    }, []);

    useEffect(() => {
        if (startExit) {
            // 2. Fade out splash card smoothly to reveal the app
            cardOpacity.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) }, (finished) => {
                if (finished) {
                    runOnJS(onFinish)();
                }
            });
        }
    }, [startExit]);

    const backdropAnimatedStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value
    }));

    const cardAnimatedStyle = useAnimatedStyle(() => ({
        opacity: cardOpacity.value,
        transform: [
            { perspective: 650 },
            { translateX: -SCREEN_WIDTH / 2 },
            { rotateY: `${rotateY.value}deg` },
            { translateX: SCREEN_WIDTH / 2 }
        ],
        backfaceVisibility: 'hidden'
    }));

    return (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 99999 }]}>
            {/* Black overlay on app content during flip-in */}
            <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#000000' }, backdropAnimatedStyle]} />

            {/* Flipping and fading splash card */}
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: '#23559F',
                        justifyContent: 'center',
                        alignItems: 'center',
                    },
                    cardAnimatedStyle
                ]}
            >
                <View style={{ position: 'absolute', top: insets.top + 10, left: 0, right: 0 }}>
                    <MetroProgressBar color="#FFFFFF" />
                </View>

                <Image
                    source={isDark ? require('../assets/splash-icon-dark.png') : require('../assets/splash-icon.png')}
                    style={{ width: 180, height: 180 }}
                    resizeMode="contain"
                />
            </Animated.View>
        </View>
    );
}

function AppContent({ onReady }: { onReady: () => void }) {
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
        if (hasApiKey !== null) {
            onReady();
        }
    }, [hasApiKey, onReady]);

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

    const [isAppReady, setIsAppReady] = useState(false);
    const [showSplashOverlay, setShowSplashOverlay] = useState(true);

    const handleAppReady = useCallback(() => {
        if (fontsLoaded) {
            // Sit on splash screen for 1.5s while progress dots animate, then fade out
            setTimeout(() => {
                setIsAppReady(true);
            }, 1500);
        }
    }, [fontsLoaded]);

    if (!fontsLoaded) {
        return null;
    }

    return (
        <ThemeProvider>
            <FontProvider>
                <View style={{ flex: 1, backgroundColor: '#000000' }}>
                    <AppContent onReady={handleAppReady} />

                    {showSplashOverlay && (
                        <AnimatedSplashOverlay startExit={isAppReady} onFinish={() => setShowSplashOverlay(false)} />
                    )}
                </View>
            </FontProvider>
        </ThemeProvider>
    );
}
