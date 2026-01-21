import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import React, { useEffect } from 'react';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AboutSheetProps {
    visible: boolean;
    onClose: () => void;
}

export function AboutSheet({ visible, onClose }: AboutSheetProps) {
    const insets = useSafeAreaInsets();

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
            transform: [{ translateX: withTiming(visible ? 0 : 50, { duration: 200 }) }],
            pointerEvents: visible ? 'auto' : 'none',
        };
    }, [visible]);

    useEffect(() => {
        const backAction = () => {
            if (visible) {
                onClose();
                return true;
            }
            return false;
        };
        const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
        return () => backHandler.remove();
    }, [visible, onClose]);

    return (
        <Animated.View style={[styles.container, animatedStyle, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.appName}>MetroMaps</Text>
                <Text style={styles.title}>about</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.infoRow}>
                    <Text style={styles.label}>Version</Text>
                    <Text style={styles.value}>1.3</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>Creator</Text>
                    <Text style={styles.value}>Alexander Batchler</Text>
                </View>

                <View style={styles.infoRow}>
                    <Text style={styles.label}>License</Text>
                    <Text style={styles.value}>MIT License</Text>
                </View>

                <View style={[styles.infoRow, { marginTop: 30 }]}>
                    <Text style={styles.description}>
                        MetroMaps is a Windows Phone inspired mapping application bringing the classic Metro design language to modern devices.
                    </Text>
                </View>
            </View>

            <TouchableOpacity style={[styles.backButton, { marginBottom: insets.bottom + 20 }]} onPress={onClose}>
                <Text style={styles.backButtonText}>back</Text>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 80,
    },
    header: {
        marginBottom: 30,
        paddingHorizontal: 20,
        marginTop: 10,
    },
    appName: {
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: 12,
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 5,
    },
    title: {
        fontFamily: 'OpenSans_300Light',
        fontSize: 42,
        color: 'white',
    },
    content: {
        paddingHorizontal: 20,
    },
    infoRow: {
        marginBottom: 20,
    },
    label: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 14,
        color: '#999',
        marginBottom: 4,
    },
    value: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 24,
        color: 'white',
    },
    description: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: 14,
        color: '#999',
        lineHeight: 22,
    },
    backButton: {
        position: 'absolute',
        bottom: 0,
        left: 20,
        right: 20,
        borderWidth: 2,
        borderColor: 'white',
        paddingVertical: 12,
        alignItems: 'center',
    },
    backButtonText: {
        color: 'white',
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: 16,
    }
});
