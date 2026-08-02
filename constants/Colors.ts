const lightTheme = {
    background: '#FFFFFF',
    accent: '#1BA1E2',
    mapLand: '#E6E3DF',
    appBarBg: '#F0F0F0',
    searchCurtainBg: 'rgba(255,255,255,0.8)',
    text: '#000000',
    textDim: '#666666',
    white: '#FFFFFF',
    black: '#000000',
    red: '#E51400',
    border: '#000000',
};

const darkTheme = {
    background: '#000000',
    accent: '#1BA1E2',
    mapLand: '#E6E3DF',
    appBarBg: '#1F1F1F',
    searchCurtainBg: 'rgba(0,0,0,0.65)',
    text: '#FFFFFF',
    textDim: '#999999',
    white: '#FFFFFF',
    black: '#000000',
    red: '#E51400',
    border: '#FFFFFF',
};

export const Colors = {
    ...darkTheme, // Fallback for non-themed components
    light: lightTheme,
    dark: darkTheme,
};
