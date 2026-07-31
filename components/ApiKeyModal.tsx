import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';
import { Colors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setGoogleApiKey } from '../services/api';
import { SettingsService } from '../services/settings';

interface ApiKeyModalProps {
    visible: boolean;
    onKeySaved: (key: string) => void;
    isCancellable?: boolean;
    onCancel?: () => void;
}

export function ApiKeyModal({ visible, onKeySaved, isCancellable = false, onCancel }: ApiKeyModalProps) {
    const insets = useSafeAreaInsets();
    const [inputKey, setInputKey] = useState('');
    const [error, setError] = useState('');

    if (!visible) return null;

    const handleSave = async () => {
        const key = inputKey.trim();
        if (!key) {
            setError('Please enter a valid API key');
            return;
        }

        // Save to storage
        await SettingsService.setApiKey(key);
        // Set in memory for API calls
        setGoogleApiKey(key);
        // Callback
        onKeySaved(key);
        setInputKey('');
        setError('');
    };

    const openGoogleCloudConsole = () => {
        Linking.openURL('https://console.cloud.google.com/google/maps-apis/credentials');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <Text style={styles.appName}>MetroMaps</Text>
                    <Text style={styles.title}>setup</Text>
                    
                    <Text style={styles.description}>
                        To use this app, you need to provide your own Google Maps API Key. 
                        This key is used for searching places and calculating routes.
                    </Text>

                    <TouchableOpacity onPress={openGoogleCloudConsole} style={{ marginBottom: verticalScale(20) }}>
                        <Text style={styles.linkText}>Get an API key from Google Cloud Console</Text>
                    </TouchableOpacity>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>API KEY</Text>
                        <TextInput
                            style={styles.input}
                            value={inputKey}
                            onChangeText={(text) => {
                                setInputKey(text);
                                setError('');
                            }}
                            placeholder="AIzaSy..."
                            placeholderTextColor="#666"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </View>

                    <View style={styles.buttonRow}>
                        {isCancellable && (
                            <TouchableOpacity style={[styles.button, styles.cancelButton]} activeOpacity={0.8} onPress={onCancel}>
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={[styles.button, styles.saveButton]} activeOpacity={0.8} onPress={handleSave}>
                            <Text style={[styles.buttonText, { color: 'black' }]}>Save & Continue</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000000',
        zIndex: 9999,
        justifyContent: 'center',
    },
    keyboardView: {
        flex: 1,
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: horizontalScale(20),
    },
    appName: {
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: normalizeFont(12),
        color: '#999',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: verticalScale(5),
    },
    title: {
        fontFamily: 'OpenSans_300Light',
        fontSize: normalizeFont(42),
        color: 'white',
        marginBottom: verticalScale(20),
    },
    description: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(15),
        color: '#ccc',
        lineHeight: verticalScale(22),
        marginBottom: verticalScale(10),
    },
    linkText: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(14),
        color: Colors.accent,
        textDecorationLine: 'underline',
    },
    inputContainer: {
        marginBottom: verticalScale(30),
    },
    inputLabel: {
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(14),
        color: '#999',
        marginBottom: verticalScale(5),
    },
    input: {
        borderWidth: 2,
        borderColor: 'white',
        padding: verticalScale(12),
        paddingHorizontal: horizontalScale(10),
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(16),
        color: 'white',
        backgroundColor: '#111',
    },
    errorText: {
        color: '#ff4444',
        fontFamily: 'OpenSans_400Regular',
        fontSize: normalizeFont(12),
        marginTop: verticalScale(5),
    },
    buttonRow: {
        flexDirection: 'row',
        gap: horizontalScale(10),
    },
    button: {
        paddingVertical: verticalScale(12),
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
    },
    saveButton: {
        backgroundColor: 'white',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: 'white',
    },
    buttonText: {
        color: 'white',
        fontFamily: 'OpenSans_600SemiBold',
        fontSize: normalizeFont(15),
    },
});
