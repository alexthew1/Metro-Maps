import type { DependencyList } from "react";
import type { IWorklet } from "./types";
/**
 * Checks whether the given function is a Worklet or not.
 */
export declare function isWorklet<TFunc extends Function>(func: TFunc): func is IWorklet<TFunc>;
/**
 * Ensures the given function is a Worklet, and throws an error if not.
 * @param func The function that should be a Worklet.
 * @returns The same function that was passed in.
 */
export declare function worklet<TFunc extends Function>(func: TFunc): IWorklet<TFunc>;
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
export declare function getWorkletDependencies(func: Function): DependencyList;
//# sourceMappingURL=worklet.d.ts.map