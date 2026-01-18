import React from 'react';
import PagerViewNativeComponent, { NativeProps } from './PagerViewNativeComponent';
/**
 * Container that allows to flip left and right between child views. Each
 * child view of the `PagerView` will be treated as a separate page
 * and will be stretched to fill the `PagerView`.
 *
 * It is important all children are `<View>`s and not composite components.
 * You can set style properties like `padding` or `backgroundColor` for each
 * child. It is also important that each child have a `key` prop.
 *
 * Example:
 *
 * ```
 * render: function() {
 *   return (
 *     <PagerView
 *       style={styles.PagerView}
 *       initialPage={0}>
 *       <View style={styles.pageStyle} key="1">
 *         <Text>First page</Text>
 *       </View>
 *       <View style={styles.pageStyle} key="2">
 *         <Text>Second page</Text>
 *       </View>
 *     </PagerView>
 *   );
 * }
 *
 * ...
 *
 * var styles = {
 *   ...
 *   PagerView: {
 *     flex: 1
 *   },
 *   pageStyle: {
 *     alignItems: 'center',
 *     padding: 20,
 *   }
 * }
 * ```
 */
export declare class PagerView extends React.Component<NativeProps> {
    private isScrolling;
    pagerView: React.ElementRef<typeof PagerViewNativeComponent> | null;
    private get deducedLayoutDirection();
    private _onPageScroll;
    private _onPageScrollStateChanged;
    private _onPageSelected;
    private _onMoveShouldSetResponderCapture;
    /**
     * A helper function to scroll to a specific page in the PagerView.
     * The transition between pages will be animated.
     */
    setPage: (selectedPage: number) => void;
    /**
     * A helper function to scroll to a specific page in the PagerView.
     * The transition between pages will *not* be animated.
     */
    setPageWithoutAnimation: (selectedPage: number) => void;
    /**
     * A helper function to enable/disable scroll imperatively
     * The recommended way is using the scrollEnabled prop, however, there might be a case where a
     * imperative solution is more useful (e.g. for not blocking an animation)
     */
    setScrollEnabled: (scrollEnabled: boolean) => void;
    render(): React.JSX.Element;
}
//# sourceMappingURL=PagerView.d.ts.map