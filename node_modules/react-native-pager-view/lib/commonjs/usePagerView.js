"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.usePagerView = usePagerView;
var _PagerView = require("./PagerView");
var _reactNative = require("react-native");
var _react = require("react");
const AnimatedPagerView = _reactNative.Animated.createAnimatedComponent(_PagerView.PagerView);
function usePagerView({
  pagesAmount
} = {
  pagesAmount: 0
}) {
  const ref = (0, _react.useRef)(null);
  const [pages, setPages] = (0, _react.useState)(new Array(pagesAmount).fill('').map((_v, index) => index));
  const [activePage, setActivePage] = (0, _react.useState)(0);
  const [isAnimated, setIsAnimated] = (0, _react.useState)(true);
  const [overdragEnabled, setOverdragEnabled] = (0, _react.useState)(false);
  const [scrollEnabled, setScrollEnabled] = (0, _react.useState)(true);
  const [scrollState, setScrollState] = (0, _react.useState)('idle');
  const [progress, setProgress] = (0, _react.useState)({
    position: 0,
    offset: 0
  });
  const onPageScrollOffset = (0, _react.useRef)(new _reactNative.Animated.Value(0)).current;
  const onPageScrollPosition = (0, _react.useRef)(new _reactNative.Animated.Value(0)).current;
  const onPageSelectedPosition = (0, _react.useRef)(new _reactNative.Animated.Value(0)).current;
  const setPage = (0, _react.useCallback)(page => isAnimated ? ref.current?.setPage(page) : ref.current?.setPageWithoutAnimation(page), [isAnimated]);
  const addPage = (0, _react.useCallback)(() => {
    setPages(prevPages => {
      return [...prevPages, prevPages.length];
    });
  }, []);
  const removePage = (0, _react.useCallback)(() => {
    setPages(prevPages => {
      if (prevPages.length === 1) {
        return prevPages;
      }
      return prevPages.slice(0, prevPages.length - 1);
    });
  }, []);
  const toggleAnimation = (0, _react.useCallback)(() => setIsAnimated(animated => !animated), []);
  const toggleScroll = (0, _react.useCallback)(() => setScrollEnabled(enabled => !enabled), []);
  const toggleOverdrag = (0, _react.useCallback)(() => setOverdragEnabled(enabled => !enabled), []);
  const onPageScroll = (0, _react.useMemo)(() => _reactNative.Animated.event([{
    nativeEvent: {
      offset: onPageScrollOffset,
      position: onPageScrollPosition
    }
  }], {
    listener: ({
      nativeEvent: {
        offset,
        position
      }
    }) => {
      setProgress({
        position,
        offset
      });
    },
    useNativeDriver: true
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);
  const onPageSelected = (0, _react.useMemo)(() => _reactNative.Animated.event([{
    nativeEvent: {
      position: onPageSelectedPosition
    }
  }], {
    listener: ({
      nativeEvent: {
        position
      }
    }) => {
      setActivePage(position);
    },
    useNativeDriver: true
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);
  const onPageScrollStateChanged = (0, _react.useCallback)(e => {
    setScrollState(e.nativeEvent.pageScrollState);
  }, []);
  return {
    ref,
    activePage,
    isAnimated,
    pages,
    scrollState,
    scrollEnabled,
    progress,
    overdragEnabled,
    setPage,
    addPage,
    removePage,
    toggleScroll,
    toggleAnimation,
    setProgress,
    onPageScroll,
    onPageSelected,
    onPageScrollStateChanged,
    toggleOverdrag,
    AnimatedPagerView,
    PagerView: _PagerView.PagerView
  };
}
//# sourceMappingURL=usePagerView.js.map