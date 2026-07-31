import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';
import { MetroButton } from './MetroButton';
import { setGoogleApiKey } from '../services/api';
import { SettingsService, UnitsType } from '../services/settings';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withDelay } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

interface SetupScreenProps {
    onComplete: () => void;
}

const FadeInView = ({ children, delay = 0, style }: any) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
        translateY.value = withDelay(delay, withSpring(0, { damping: 15, stiffness: 100 }));
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
        transform: [{ translateY: translateY.value }],
    }));

    return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
};

export function SetupScreen({ onComplete }: SetupScreenProps) {
    const insets = useSafeAreaInsets();
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');
    const [units, setUnits] = useState<UnitsType>('metric');
    const [zoomEnabled, setZoomEnabled] = useState(false);

    const handleSave = async () => {
        const key = apiKey.trim();
        if (!key || key.length < 30) {
            setError('Please enter a valid Google Maps API Key.');
            return;
        }
        
        const restrictedKey = process.env.EXPO_PUBLIC_RESTRICTED_API_KEY;
        if (restrictedKey && key === restrictedKey) {
            setError('Please use your own personal API key. This is a restricted test key.');
            return;
        }

        try {
            await AsyncStorage.setItem('USER_GOOGLE_API_KEY', key);
            setGoogleApiKey(key);
            
            await SettingsService.setUnits(units);
            await SettingsService.setZoomControls(zoomEnabled);

            onComplete();
        } catch (e) {
            setError('Failed to save settings. Please try again.');
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 20) }]}
            behavior="padding"
        >
            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <FadeInView delay={0}>
                    <View style={styles.headerContainer}>
                        <Text style={[GlobalStyles.metroXL, styles.title]}>MetroMaps</Text>
                        <Text style={[GlobalStyles.metroMD, styles.subtitle]}>Setup your API Key</Text>
                    </View>
                </FadeInView>
                
                <View style={styles.instructionsContainer}>
                    <FadeInView delay={200}>
                        <Text style={[GlobalStyles.metroMD, styles.instructionText, { marginBottom: 25, color: 'white' }]}>
                            To use this app, you must provide your own Google Maps API Key. 
                        </Text>
                    </FadeInView>
                    
                    <FadeInView delay={400}>
                        <Text style={[GlobalStyles.metroLG, styles.stepTitle]}>How to get a key:</Text>
                    </FadeInView>
                    
                    <FadeInView delay={600}>
                        <View style={styles.stepRow}>
                            <MaterialCommunityIcons name="google-cloud" size={24} color={Colors.accent} style={styles.stepIcon} />
                            <Text style={[GlobalStyles.metroSM, styles.instructionText]}>Go to the Google Cloud Console and create a new project.</Text>
                        </View>
                    </FadeInView>

                    <FadeInView delay={700}>
                        <View style={styles.stepRow}>
                            <MaterialCommunityIcons name="api" size={24} color={Colors.accent} style={styles.stepIcon} />
                            <View style={{ flex: 1 }}>
                                <Text style={[GlobalStyles.metroSM, styles.instructionText]}>Enable the following APIs:</Text>
                                <Text style={[GlobalStyles.metroSM, styles.bulletPoint]}>• Places API (New & Legacy)</Text>
                                <Text style={[GlobalStyles.metroSM, styles.bulletPoint]}>• Routes API</Text>
                                <Text style={[GlobalStyles.metroSM, styles.bulletPoint]}>• Maps SDK for Android & iOS</Text>
                            </View>
                        </View>
                    </FadeInView>

                    <FadeInView delay={800}>
                        <View style={styles.stepRow}>
                            <MaterialCommunityIcons name="key" size={24} color={Colors.accent} style={styles.stepIcon} />
                            <Text style={[GlobalStyles.metroSM, styles.instructionText]}>Create an API Key under Credentials and paste it below.</Text>
                        </View>
                    </FadeInView>
                </View>
                <FadeInView delay={900} style={styles.settingsSection}>
                    <Text style={[GlobalStyles.metroMD, styles.inputLabel, { color: 'white', marginBottom: 15 }]}>Preferences</Text>
                    
                    <View style={styles.settingRow}>
                        <Text style={[GlobalStyles.metroSM, { color: '#ccc', flex: 1 }]}>Distance Units</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => setUnits('imperial')} style={[styles.pill, units === 'imperial' && styles.pillActive]}>
                                <Text style={styles.pillText}>Imp</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setUnits('metric')} style={[styles.pill, units === 'metric' && styles.pillActive]}>
                                <Text style={styles.pillText}>Met</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setUnits('imperial_uk')} style={[styles.pill, units === 'imperial_uk' && styles.pillActive]}>
                                <Text style={styles.pillText}>UK</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.settingRow, { marginTop: 15, marginBottom: 25 }]}>
                        <Text style={[GlobalStyles.metroSM, { color: '#ccc', flex: 1 }]}>Map Zoom Controls</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity onPress={() => setZoomEnabled(true)} style={[styles.pill, zoomEnabled && styles.pillActive]}>
                                <Text style={styles.pillText}>On</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setZoomEnabled(false)} style={[styles.pill, !zoomEnabled && styles.pillActive]}>
                                <Text style={styles.pillText}>Off</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </FadeInView>

            </ScrollView>

            <FadeInView delay={1000} style={styles.bottomContainer}>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={[styles.input, error ? styles.inputError : null]}
                        placeholder="Paste API Key (AIzaSy...)"
                        placeholderTextColor="#666"
                        value={apiKey}
                        onChangeText={(text) => {
                            setApiKey(text);
                            setError('');
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {error ? <Text style={[GlobalStyles.metroSM, styles.errorText]}>{error}</Text> : null}
                </View>

                <MetroButton 
                    title="Save & Continue" 
                    onPress={handleSave} 
                />

                <Text style={[GlobalStyles.metroSM, styles.disclaimer]}>
                    * This key is stored securely on your device and sent directly to Google.
                </Text>
            </FadeInView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        zIndex: 9999,
    },
    scrollContent: {
        padding: 24,
        flexGrow: 1,
        justifyContent: 'flex-start',
        paddingTop: 40,
    },
    bottomContainer: {
        padding: 24,
        paddingTop: 10,
        backgroundColor: Colors.background,
    },
    headerContainer: {
        alignItems: 'flex-start',
        marginBottom: 40,
    },
    title: {
        color: 'white',
        lineHeight: 62,
    },
    subtitle: {
        color: Colors.accent,
        marginTop: -5,
    },
    instructionsContainer: {
        paddingLeft: 5,
        marginBottom: 20,
    },
    stepTitle: {
        color: 'white',
        marginBottom: 20,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    stepIcon: {
        marginRight: 15,
        marginTop: 2,
    },
    instructionText: {
        color: '#ccc',
        lineHeight: 28,
        flex: 1,
    },
    bulletPoint: {
        color: '#aaa',
        marginLeft: 0,
        marginTop: 4,
        lineHeight: 26,
    },
    inputContainer: {
        marginBottom: 25,
    },
    input: {
        backgroundColor: 'white',
        borderColor: Colors.accent,
        borderWidth: 2,
        height: 50,
        paddingHorizontal: 15,
        fontFamily: 'OpenSans_400Regular',
        fontSize: 20,
        color: 'black',
    },
    inputError: {
        borderColor: '#ff4444',
    },
    errorText: {
        color: '#ff4444',
        marginTop: 8,
        marginLeft: 5,
    },
    disclaimer: {
        color: '#555',
        marginTop: 25,
        textAlign: 'center',
        fontSize: 12,
    },
    settingsSection: {
        marginTop: 20,
        marginBottom: 20,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    pill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#444',
        backgroundColor: '#111',
    },
    pillActive: {
        backgroundColor: Colors.accent,
        borderColor: Colors.accent,
    },
    pillText: {
        color: 'white',
        fontFamily: 'OpenSans_400Regular',
        fontSize: 14,
    },
    inputLabel: {
        color: '#999',
    }
});
