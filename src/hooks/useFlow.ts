import type { Flow } from "@tsip/types";
import { useSyncExternalStore, useCallback } from "react";
import { skipToken, type SkipToken } from "../skipToken";

/**
 * Subscribes to a Flow and returns its current value.
 *
 * @typeParam T - The type of value stored in the Flow
 * @param flow - The Flow instance to subscribe to, or `skipToken` to skip subscription
 * @returns The current value from the Flow, or `null` if `skipToken` is passed
 *
 * @example
 * ```tsx
 * const counterFlow = createFlow(0);
 *
 * function Counter() {
 *   const count = useFlow(counterFlow);
 *   return <div>Count: {count}</div>;
 * }
 * ```
 *
 * @example
 * // Conditional subscription using skipToken
 * ```tsx
 * function ConditionalCounter({ enabled }: { enabled: boolean }) {
 *   const count = useFlow(enabled ? counterFlow : skipToken);
 *   return <div>Count: {count ?? 'disabled'}</div>;
 * }
 * ```
 */
export function useFlow(flow: SkipToken): null;
export function useFlow<T>(flow: Flow<T>): T;
export function useFlow<T>(flow: Flow<T> | SkipToken): T | null;
export function useFlow<T>(flow: Flow<T> | SkipToken): T | null {
    const subscribe = useCallback(
        (notify: () => void) => {
            if (flow === skipToken) {
                return () => {
                    // noop
                };
            }

            return flow.subscribe(notify).unsubscribe;
        },
        [flow],
    );

    const getSnapshot = useCallback(() => {
        if (flow === skipToken) return null;
        return flow.getSnapshot();
    }, [flow]);

    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
