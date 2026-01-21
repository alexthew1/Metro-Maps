import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/Colors';
import { GlobalStyles } from '../constants/Styles';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            return (
                <View style={styles.container}>
                    <Text style={[GlobalStyles.metroLG, styles.title]}>:(</Text>
                    <Text style={[GlobalStyles.metroMD, styles.subtitle]}>Something went wrong.</Text>
                    <Text style={[GlobalStyles.metroSM, styles.errorText]}>
                        {this.state.error?.toString()}
                    </Text>
                    <TouchableOpacity style={styles.button} onPress={this.handleReset}>
                        <Text style={[GlobalStyles.metroMD, { color: Colors.background }]}>Try Again</Text>
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
        backgroundColor: Colors.accent, // Use accent or error color
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        marginBottom: 16,
    },
    subtitle: {
        marginBottom: 8,
    },
    errorText: {
        marginBottom: 32,
        opacity: 0.8,
        textAlign: 'center',
    },
    button: {
        backgroundColor: Colors.white,
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
});
