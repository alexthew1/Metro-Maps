import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device
// (iPhone 11 Pro / Pixel 4 approximately)
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scale based on width
 * Good for padding, margin, width, fontSize
 */
export const horizontalScale = (size: number) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Scale based on height
 * Good for height, vertical margin/padding
 */
export const verticalScale = (size: number) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Scale with a moderation factor
 * Good for font sizes and spacing where simple scaling might be too aggressive
 * factor = 0.5 means it's 50% responsive, 50% fixed.
 */
export const moderateScale = (size: number, factor = 0.5) => size + (horizontalScale(size) - size) * factor;

/**
 * Helper particularly for font sizes to ensure they don't get too tiny or huge
 */
export const normalizeFont = (size: number) => {
    return Math.round(PixelRatio.roundToNearestPixel(moderateScale(size, 0.4)));
};

export const SCREEN_DIMENSIONS = {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
};
