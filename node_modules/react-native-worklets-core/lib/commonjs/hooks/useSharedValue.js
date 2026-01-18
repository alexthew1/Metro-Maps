"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useSharedValue = useSharedValue;
var _react = require("react");
var _NativeWorklets = require("../NativeWorklets");
/**
 * Create a Shared Value that persists between re-renders.
 * @param initialValue The initial value for this Shared Value
 * @returns The Shared Value instance
 * @example
 * ```ts
 * const counter = useSharedValue(42)
 * Worklets.defaultContext.runAsync(() => {
 *   'worklet'
 *   counter.value = 73
 * })
 * ```
 */
function useSharedValue(initialValue) {
  const ref = (0, _react.useRef)();
  if (ref.current == null) {
    ref.current = _NativeWorklets.Worklets.createSharedValue(initialValue);
  }
  return ref.current;
}
//# sourceMappingURL=useSharedValue.js.map