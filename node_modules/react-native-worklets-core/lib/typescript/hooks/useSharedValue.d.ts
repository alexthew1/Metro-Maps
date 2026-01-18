import type { ISharedValue } from "../types";
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
export declare function useSharedValue<T>(initialValue: T): ISharedValue<T>;
//# sourceMappingURL=useSharedValue.d.ts.map