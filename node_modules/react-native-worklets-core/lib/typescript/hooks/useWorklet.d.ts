import type { IWorkletContext } from "../types";
/**
 * Create a Worklet function that automatically memoizes itself using it's auto-captured closure.
 * The returned function can be called from both a Worklet context and the JS context, but will execute on a Worklet context.
 *
 * @worklet
 * @param context The context to run this Worklet in. Can be `default` to use the default background context, or a custom context.
 * @param callback The Worklet. Must be marked with the `'worklet'` directive.
 * @returns A memoized Worklet
 * ```ts
 * const sayHello = useWorklet('default', (name: string) => {
 *   'worklet'
 *   console.log(`Hello ${name}, I am running on the Worklet Thread!`)
 * })
 * sayHello()
 * ```
 */
export declare function useWorklet<T extends (...args: any[]) => any>(context: IWorkletContext | "default", callback: T): (...args: Parameters<T>) => Promise<ReturnType<T>>;
//# sourceMappingURL=useWorklet.d.ts.map