import { useRef } from "react";
import { Worklets } from "../NativeWorklets";

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
export function useSharedValue(initialValue) {
  const ref = useRef();
  if (ref.current == null) {
    ref.current = Worklets.createSharedValue(initialValue);
  }
  return ref.current;
}
//# sourceMappingURL=useSharedValue.js.map