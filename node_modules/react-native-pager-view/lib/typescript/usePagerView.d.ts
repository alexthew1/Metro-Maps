/// <reference types="react" />
import type * as ReactNative from 'react-native';
import type { OnPageScrollStateChangedEventData as PageScrollStateChangedNativeEventData } from './PagerViewNativeComponent';
type PageScrollStateChangedNativeEvent = ReactNative.NativeSyntheticEvent<PageScrollStateChangedNativeEventData>;
import { PagerView } from './PagerView';
import { Animated } from 'react-native';
export type UsePagerViewProps = ReturnType<typeof usePagerView>;
type UsePagerViewParams = {
    pagesAmount: number;
};
export declare function usePagerView({ pagesAmount }?: UsePagerViewParams): {
    ref: import("react").RefObject<PagerView | null>;
    activePage: number;
    isAnimated: boolean;
    pages: number[];
    scrollState: string;
    scrollEnabled: boolean;
    progress: {
        position: number;
        offset: number;
    };
    overdragEnabled: boolean;
    setPage: (page: number) => void;
    addPage: () => void;
    removePage: () => void;
    toggleScroll: () => void;
    toggleAnimation: () => void;
    setProgress: import("react").Dispatch<import("react").SetStateAction<{
        position: number;
        offset: number;
    }>>;
    onPageScroll: (...args: any[]) => void;
    onPageSelected: (...args: any[]) => void;
    onPageScrollStateChanged: (e: PageScrollStateChangedNativeEvent) => void;
    toggleOverdrag: () => void;
    AnimatedPagerView: Animated.AnimatedComponent<typeof PagerView>;
    PagerView: typeof PagerView;
};
export {};
//# sourceMappingURL=usePagerView.d.ts.map