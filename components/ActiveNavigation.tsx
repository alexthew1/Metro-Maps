import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { MetroButton } from './MetroButton';
import { RouteResult } from '../services/api';

interface ActiveNavigationProps {
    route: RouteResult | null;
    onStopConfig: () => void;
}

export function ActiveNavigation({ route, onStopConfig }: ActiveNavigationProps) {
    const insets = useSafeAreaInsets();

    if (!route) return null;

    const nextManeuver = route.maneuvers[0]; // Simplified for prototype
    const durationMin = Math.round(route.duration / 60);

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {/* Top Bar: Next Maneuver */}
            <View style={styles.topBar}>
                <Text style={[GlobalStyles.metroMD, { color: Colors.background, fontWeight: 'bold' }]}>
                    {nextManeuver?.maneuver?.type?.toUpperCase() || 'HEAD NORTH'}
                </Text>
                <Text style={[GlobalStyles.metroXL, { color: Colors.background, marginTop: 4 }]}>
                    {nextManeuver?.name || 'Start driving'}
                </Text>
                <Text style={[GlobalStyles.metroSM, { color: '#333', marginTop: 4 }]}>
                    Then in 0.5 mi, turn left
                </Text>
            </View>

            {/* Bottom Bar: Stats & Stop */}
            <View style={styles.bottomBar}>
                <View>
                    <Text style={[GlobalStyles.metroLG, { color: 'white' }]}>{durationMin} min</Text>
                    <Text style={[GlobalStyles.metroSM, { color: '#999' }]}>
                        {(route.distance / 1609.34).toFixed(1)} mi • 12:45 ETA
                    </Text>
                </View>

                <MetroButton
                    title="end"
                    variant="outlined"
                    onPress={onStopConfig}
                    style={{ borderColor: Colors.red }}
                    textStyle={{ color: Colors.red }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'space-between',
        zIndex: 100, // Topmost
        pointerEvents: 'box-none', // Allow touches to pass through to map in middle
    },
    topBar: {
        backgroundColor: Colors.accent,
        padding: 20,
        margin: 10,
        // Metro floating style
    },
    bottomBar: {
        backgroundColor: 'black',
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    }
});
