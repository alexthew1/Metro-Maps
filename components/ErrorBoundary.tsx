import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useCustomFont } from '../contexts/FontContext';
import { horizontalScale, verticalScale, normalizeFont } from '../utils/responsive';

interface Props {
    children: ReactNode;
    t: any;
    colors: any;
    getFont: (font: string) => string;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundaryClass extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        const { t, colors, getFont } = this.props;

        if (this.state.hasError) {
            return (
                <View style={[styles.container, { backgroundColor: colors.accent }]}>
                    <Text style={[styles.title, { color: 'white', fontFamily: getFont('OpenSans_300Light') }]}>:(</Text>
                    <Text style={[styles.subtitle, { color: 'white', fontFamily: getFont('OpenSans_400Regular') }]}>{t('Something went wrong.')}</Text>
                    <Text style={[styles.errorText, { color: 'white', fontFamily: getFont('OpenSans_400Regular') }]}>
                        {this.state.error?.toString()}
                    </Text>
                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.background }]} onPress={this.handleReset}>
                        <Text style={{ color: colors.text, fontSize: normalizeFont(18), fontFamily: getFont('OpenSans_600SemiBold') }}>{t('Try Again')}</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: normalizeFont(60),
        marginBottom: 16,
    },
    subtitle: {
        fontSize: normalizeFont(24),
        marginBottom: 8,
    },
    errorText: {
        fontSize: normalizeFont(14),
        marginBottom: 32,
        opacity: 0.8,
        textAlign: 'center',
    },
    button: {
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
});

export function ErrorBoundary({ children }: { children: ReactNode }) {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { customFonts } = useCustomFont();

    const getFont = (defaultFont: string) => {
        if (defaultFont.includes('300Light')) return customFonts.light || defaultFont;
        if (defaultFont.includes('400Regular')) return customFonts.regular || defaultFont;
        if (defaultFont.includes('600SemiBold')) return customFonts.semiBold || defaultFont;
        if (defaultFont.includes('700Bold')) return customFonts.semiBold || defaultFont;
        return defaultFont;
    };

    return (
        <ErrorBoundaryClass t={t} colors={colors} getFont={getFont}>
            {children}
        </ErrorBoundaryClass>
    );
}
