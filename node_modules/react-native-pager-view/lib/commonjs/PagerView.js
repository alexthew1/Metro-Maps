"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.PagerView = void 0;
var _react = _interopRequireDefault(require("react"));
var _reactNative = require("react-native");
var _utils = require("./utils");
var _PagerViewNativeComponent = _interopRequireWildcard(require("./PagerViewNativeComponent"));
var _jsxRuntime = require("react/jsx-runtime");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
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

class PagerView extends _react.default.Component {
  isScrolling = false;
  pagerView = null;
  get deducedLayoutDirection() {
    if (!this.props.layoutDirection ||
    //@ts-ignore fix it
    this.props.layoutDirection === 'locale') {
      return _reactNative.I18nManager.isRTL ? 'rtl' : 'ltr';
    } else {
      return this.props.layoutDirection;
    }
  }
  _onPageScroll = e => {
    if (this.props.onPageScroll) {
      this.props.onPageScroll(e);
    }

    // Not implemented on iOS yet
    if (_reactNative.Platform.OS === 'android') {
      if (this.props.keyboardDismissMode === 'on-drag') {
        _reactNative.Keyboard.dismiss();
      }
    }
  };
  _onPageScrollStateChanged = e => {
    if (this.props.onPageScrollStateChanged) {
      this.props.onPageScrollStateChanged(e);
    }
    this.isScrolling = e.nativeEvent.pageScrollState === 'dragging';
  };
  _onPageSelected = e => {
    if (this.props.onPageSelected) {
      this.props.onPageSelected(e);
    }
  };
  _onMoveShouldSetResponderCapture = () => {
    return this.isScrolling;
  };

  /**
   * A helper function to scroll to a specific page in the PagerView.
   * The transition between pages will be animated.
   */
  setPage = selectedPage => {
    if (this.pagerView) {
      _PagerViewNativeComponent.Commands.setPage(this.pagerView, selectedPage);
    }
  };

  /**
   * A helper function to scroll to a specific page in the PagerView.
   * The transition between pages will *not* be animated.
   */
  setPageWithoutAnimation = selectedPage => {
    if (this.pagerView) {
      _PagerViewNativeComponent.Commands.setPageWithoutAnimation(this.pagerView, selectedPage);
    }
  };

  /**
   * A helper function to enable/disable scroll imperatively
   * The recommended way is using the scrollEnabled prop, however, there might be a case where a
   * imperative solution is more useful (e.g. for not blocking an animation)
   */
  setScrollEnabled = scrollEnabled => {
    if (this.pagerView) {
      _PagerViewNativeComponent.Commands.setScrollEnabledImperatively(this.pagerView, scrollEnabled);
    }
  };
  render() {
    return /*#__PURE__*/(0, _jsxRuntime.jsx)(_PagerViewNativeComponent.default, {
      ...this.props,
      ref: ref => {
        this.pagerView = ref;
      },
      style: this.props.style,
      layoutDirection: this.deducedLayoutDirection,
      onPageScroll: this._onPageScroll,
      onPageScrollStateChanged: this._onPageScrollStateChanged,
      onPageSelected: this._onPageSelected,
      onMoveShouldSetResponderCapture: this._onMoveShouldSetResponderCapture,
      children: (0, _utils.childrenWithOverriddenStyle)(this.props.children)
    });
  }
}
exports.PagerView = PagerView;
//# sourceMappingURL=PagerView.js.map