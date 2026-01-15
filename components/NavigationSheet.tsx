import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { GlobalStyles } from '../constants/Styles';
import { Colors } from '../constants/Colors';
import { RouteResult } from '../services/api';

import { MetroButton } from './MetroButton';

interface NavigationSheetProps {
    route: RouteResult | null;
    state: 'hidden' | 'peek' | 'expanded';
    onStateChange: (state: 'hidden' | 'peek' | 'expanded') => void;
    onStartNavigation?: () => void;
}

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function NavigationSheet({ route, state, onStateChange, onStartNavigation }: NavigationSheetProps) {
    const insets = useSafeAreaInsets();
    if (!route) return null;

    const durationMin = Math.round(route.duration / 60);
    // Convert meters to miles roughly
    const distMiles = (route.distance / 1609.34).toFixed(1);

    const Header = (
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText]}>{durationMin} min • {distMiles} mi</Text>
                <MetroButton title="start" variant="accent" onPress={() => onStartNavigation && onStartNavigation()} style={{ paddingVertical: 4, paddingHorizontal: 12 }} textStyle={{ fontSize: 14 }} />
            </View>
            <Text style={GlobalStyles.metroXL}>directions</Text>
        </View>
    );

    return (
        <BottomSheet visible={true} state={state} onStateChange={onStateChange} header={Header}>
            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}>
                {route.maneuvers.map((step, index) => (
                    <View key={index} style={styles.maneuver}>
                        <Text style={styles.arrow}>{getArrow(step.maneuver?.modifier)}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={GlobalStyles.metroMD}>{step.maneuver?.type || 'Go straight'}</Text>
                            <Text style={[GlobalStyles.metroSM, GlobalStyles.dimText]}>{step.name || 'on road'}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </BottomSheet>
    );
}

function getArrow(modifier: string) {
    if (modifier?.includes('left')) return '↰';
    if (modifier?.includes('right')) return '↱';
    return '↑';
}

const styles = StyleSheet.create({
    header: {
        padding: 20,
        backgroundColor: 'black',
    },
    content: {
        padding: 20,
    },
    maneuver: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 30,
    },
    arrow: {
        color: 'white',
        fontSize: 40,
        width: 50,
        lineHeight: 40,
    }
});
