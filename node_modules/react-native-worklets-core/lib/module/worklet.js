const EXPECTED_KEYS = ["__closure", "__initData", "__workletHash"];

/**
 * Checks whether the given function is a Worklet or not.
 */
export function isWorklet(func) {
  const maybeWorklet = func;
  if (typeof maybeWorklet.__workletHash !== "number") return false;
  if (maybeWorklet.__closure == null || typeof maybeWorklet.__closure !== "object") return false;
  const initData = maybeWorklet.__initData;
  if (initData == null || typeof initData !== "object") return false;
  if (typeof initData.sourceMap !== "string" || typeof initData.code !== "string" || typeof initData.location !== "string") return false;
  return true;
}
class NotAWorkletError extends Error {
  constructor(func) {
    let funcName = func.name;
    if (funcName.length === 0) {
      funcName = func.toString();
    }
    const expected = `[${EXPECTED_KEYS.join(", ")}]`;
    const received = `[${Object.keys(func).join(", ")}]`;
    super(`The function "${funcName}" is not a Worklet! \n` + `- Make sure the function "${funcName}" is decorated with the 'worklet' directive! \n` + `- Make sure react-native-worklets-core is installed properly! \n` + `- Make sure to add the react-native-worklets-core babel plugin to your babel.config.js! \n` + `- Make sure that no other plugin overrides the react-native-worklets-core babel plugin! \n` + `Expected "${funcName}" to contain ${expected}, but "${funcName}" only has these properties: ${received}`);
  }
}

/**
 * Ensures the given function is a Worklet, and throws an error if not.
 * @param func The function that should be a Worklet.
 * @returns The same function that was passed in.
 */
export function worklet(func) {
  if (!isWorklet(func)) {
    throw new NotAWorkletError(func);
  }
  return func;
}

/**
 * Get the dependencies of the given worklet.
 * This can be used to automatically fill the second parameter of a `useCallback` or `useMemo` to use the closure captured in the given Worklet.
 *
 * @throws If the given {@linkcode func} is not a Worklet.
 * @example
 * ```ts
 * const valueFromOutside = 5
 * const worklet = () => {
 *   'worklet'
 *   return valueFromOutside + 10
 * }
 * const dependencies = getWorkletDependencies(worklet) // [valueFromOutside]
 * const memoizedWorklet = useCallback(worklet, dependencies)
 * ```
 */
export function getWorkletDependencies(func) {
  if (__DEV__) {
    // In debug, perform runtime checks to ensure the given func is a safe worklet, and throw an error otherwise
    const workletFunc = worklet(func);
    return Object.values(workletFunc.__closure);
  }
  // in release, just cast and assume it's a worklet. if this crashes, the user saw it first in debug anyways.
  return Object.values(func.__closure);
}
//# sourceMappingURL=worklet.js.map