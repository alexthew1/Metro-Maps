"use strict";

import { PagerView } from './PagerView';
import { Animated } from 'react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);
export function usePagerView({
  pagesAmount
} = {
  pagesAmount: 0
}) {
  const ref = useRef(null);
  const [pages, setPages] = useState(new Array(pagesAmount).fill('').map((_v, index) => index));
  const [activePage, setActivePage] = useState(0);
  const [isAnimated, setIsAnimated] = useState(true);
  const [overdragEnabled, setOverdragEnabled] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [scrollState, setScrollState] = useState('idle');
  const [progress, setProgress] = useState({
    position: 0,
    offset: 0
  });
  const onPageScrollOffset = useRef(new Animated.Value(0)).current;
  const onPageScrollPosition = useRef(new Animated.Value(0)).current;
  const onPageSelectedPosition = useRef(new Animated.Value(0)).current;
  const setPage = useCallback(page => isAnimated ? ref.current?.setPage(page) : ref.current?.setPageWithoutAnimation(page), [isAnimated]);
  const addPage = useCallback(() => {
    setPages(prevPages => {
      return [...prevPages, prevPages.length];
    });
  }, []);
  const removePage = useCallback(() => {
    setPages(prevPages => {
      if (prevPages.length === 1) {
        return prevPages;
      }
      return prevPages.slice(0, prevPages.length - 1);
    });
  }, []);
  const toggleAnimation = useCallback(() => setIsAnimated(animated => !animated), []);
  const toggleScroll = useCallback(() => setScrollEnabled(enabled => !enabled), []);
  const toggleOverdrag = useCallback(() => setOverdragEnabled(enabled => !enabled), []);
  const onPageScroll = useMemo(() => Animated.event([{
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
  const onPageSelected = useMemo(() => Animated.event([{
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
  const onPageScrollStateChanged = useCallback(e => {
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
    PagerView
  };
}
//# sourceMappingURL=usePagerView.js.map