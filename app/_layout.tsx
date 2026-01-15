import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {

    useEffect(() => {
        // Lock to portrait for this prototype to simplify layout
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }, []);

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={{ flex: 1, backgroundColor: Colors.background }}>
                {/* Hide Status Bar -> Fullscreen Experience */}
                <StatusBar hidden={true} style="light" />
                <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
                    <Stack.Screen name="index" />
                </Stack>
            </View>
        </GestureHandlerRootView>
    );
}
