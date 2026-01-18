"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.childrenWithOverriddenStyle = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _jsxRuntime = require("react/jsx-runtime");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
const childrenWithOverriddenStyle = children => {
  return _react.Children.map(children, child => {
    const element = child;
    return (
      /*#__PURE__*/
      // Add a wrapper to ensure layout is calculated correctly
      (0, _jsxRuntime.jsx)(_reactNative.View, {
        style: _reactNative.StyleSheet.absoluteFill,
        collapsable: false,
        children: /*#__PURE__*/_react.default.cloneElement(element, {
          ...element.props,
          // Override styles so that each page will fill the parent.
          style: [element.props.style, _reactNative.StyleSheet.absoluteFill]
        })
      })
    );
  });
};
exports.childrenWithOverriddenStyle = childrenWithOverriddenStyle;
//# sourceMappingURL=utils.js.map