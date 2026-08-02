import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Font from 'expo-font';

export type FontWeight = 'light' | 'regular' | 'semiBold';

interface FontContextType {
    customFonts: {
        light: string | null;
        regular: string | null;
        semiBold: string | null;
    };
    loadCustomFont: (weight: FontWeight) => Promise<void>;
    clearCustomFont: (weight: FontWeight) => Promise<void>;
    isLoadingFont: boolean;
}

const FontContext = createContext<FontContextType | undefined>(undefined);

const CUSTOM_FONT_KEYS = {
    light: 'customFontUri_light',
    regular: 'customFontUri_regular',
    semiBold: 'customFontUri_semiBold'
};

const CUSTOM_FONT_NAMES = {
    light: 'UserCustomFont_Light',
    regular: 'UserCustomFont_Regular',
    semiBold: 'UserCustomFont_SemiBold'
};

export const FontProvider = ({ children }: { children: React.ReactNode }) => {
    const [customFonts, setCustomFonts] = useState<{ light: string | null, regular: string | null, semiBold: string | null }>({
        light: null,
        regular: null,
        semiBold: null
    });
    const [isLoadingFont, setIsLoadingFont] = useState(true);

    useEffect(() => {
        const initFont = async () => {
            try {
                const weights: FontWeight[] = ['light', 'regular', 'semiBold'];
                const loadedFonts: any = { light: null, regular: null, semiBold: null };
                
                for (const weight of weights) {
                    const savedUri = await AsyncStorage.getItem(CUSTOM_FONT_KEYS[weight]);
                    if (savedUri) {
                        const fileInfo = await FileSystem.getInfoAsync(savedUri);
                        if (fileInfo.exists) {
                            await Font.loadAsync({
                                [CUSTOM_FONT_NAMES[weight]]: { uri: savedUri }
                            });
                            loadedFonts[weight] = CUSTOM_FONT_NAMES[weight];
                        } else {
                            await AsyncStorage.removeItem(CUSTOM_FONT_KEYS[weight]);
                        }
                    }
                }
                setCustomFonts(loadedFonts);
            } catch (e) {
                console.log('Error initializing custom fonts', e);
            } finally {
                setIsLoadingFont(false);
            }
        };
        initFont();
    }, []);

    const loadCustomFont = async (weight: FontWeight) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['font/ttf', 'application/x-font-ttf', 'font/otf'],
                copyToCacheDirectory: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const newUri = (FileSystem.documentDirectory || '') + `custom_font_${weight}.ttf`;
                
                // Copy to document directory to persist it
                await FileSystem.copyAsync({
                    from: asset.uri,
                    to: newUri
                });

                // Load the font
                await Font.loadAsync({
                    [CUSTOM_FONT_NAMES[weight]]: { uri: newUri }
                });

                // Save reference
                await AsyncStorage.setItem(CUSTOM_FONT_KEYS[weight], newUri);
                setCustomFonts(prev => ({ ...prev, [weight]: CUSTOM_FONT_NAMES[weight] }));
            }
        } catch (e) {
            console.log(`Error loading custom font for ${weight}`, e);
        }
    };

    const clearCustomFont = async (weight: FontWeight) => {
        try {
            await AsyncStorage.removeItem(CUSTOM_FONT_KEYS[weight]);
            setCustomFonts(prev => ({ ...prev, [weight]: null }));
        } catch (e) {
            console.log(`Error clearing custom font for ${weight}`, e);
        }
    };

    return (
        <FontContext.Provider value={{ customFonts, loadCustomFont, clearCustomFont, isLoadingFont }}>
            {children}
        </FontContext.Provider>
    );
};

export const useCustomFont = () => {
    const context = useContext(FontContext);
    if (context === undefined) {
        throw new Error('useCustomFont must be used within a FontProvider');
    }
    return context;
};
