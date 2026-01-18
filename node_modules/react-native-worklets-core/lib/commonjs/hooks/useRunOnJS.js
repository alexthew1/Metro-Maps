"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.useRunOnJS = useRunOnJS;
var _react = require("react");
var _NativeWorklets = require("../NativeWorklets");
/**
 * Create a Worklet function that runs the given function on the JS context.
 * The returned function can be called from a worklet to hop back to the JS thread.
 *
 * @param callback The JS code to run. This is **not** a `'worklet'`.
 * @param dependencyList The React dependencies of this Worklet.
 * @returns A memoized Worklet
 * @example
 * ```ts
 * const sayHello = useRunOnJS((name: string) => {
 *   console.log(`Hello ${name}, I am running on the JS Thread!`)
 * }, [])
 * Worklets.defaultContext.runAsync(() => {
 *   'worklet'
 *   sayHello('Marc')
 * })
 * ```
 */
function useRunOnJS(callback, dependencyList) {
  const worklet = (0, _react.useMemo)(() => _NativeWorklets.Worklets.createRunOnJS(callback),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  dependencyList);
  return worklet;
}
//# sourceMappingURL=useRunOnJS.js.map