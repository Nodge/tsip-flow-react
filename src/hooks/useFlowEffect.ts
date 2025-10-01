import type { Flow } from "@tsip/types";
import { useEffect, useRef } from "react";
import { skipToken, type SkipToken } from "../skipToken";

/**
 * Subscribes to a Flow and runs a handler function whenever the value changes.
 *
 * It calls the handler function with the current value immediately on mount,
 * and then again whenever the Flow's value changes. The handler can optionally
 * return a cleanup function that will be called before the next handler
 * execution or on unmount.
 *
 * @typeParam T - The type of value in the Flow
 *
 * @param flow - The Flow instance to subscribe to, or `skipToken` to skip subscription
 * @param handler - Function called with the current value. Can return a cleanup function.
 *
 * @example
 * Basic usage:
 * ```tsx
 * function Logger() {
 *   useFlowEffect(counterFlow, (count) => {
 *     console.log('Count changed:', count);
 *   });
 *   return null;
 * }
 * ```
 *
 * @example
 * Conditional subscription using skipToken:
 * ```tsx
 * function ConditionalLogger({ enabled }: { enabled: boolean }) {
 *   useFlowEffect(
 *     enabled ? counterFlow : skipToken,
 *     (count) => {
 *       console.log('Count:', count);
 *     }
 *   );
 *   return null;
 * }
 * ```
 *
 * @example
 * Side effects with external APIs:
 * ```tsx
 * function DocumentTitleSync() {
 *   useFlowEffect(titleFlow, (title) => {
 *     document.title = title;
 *
 *     // Restore original title on cleanup
 *     return () => {
 *       document.title = 'Original Title';
 *     };
 *   });
 *   return null;
 * }
 * ```
 */
export function useFlowEffect<T>(
    flow: Flow<T> | SkipToken,
    // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
    handler: (value: T) => (() => void) | void,
): void {
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        if (flow === skipToken) {
            return;
        }

        let cancelled = false;
        let prevSnapshot = flow.getSnapshot();
        let teardown = handlerRef.current(prevSnapshot);

        const sub = flow.subscribe(() => {
            queueMicrotask(() => {
                if (cancelled) return;

                const snapshot = flow.getSnapshot();
                if (snapshot !== prevSnapshot) {
                    prevSnapshot = snapshot;

                    if (teardown) {
                        teardown();
                        teardown = undefined;
                    }

                    teardown = handlerRef.current(snapshot);
                }
            });
        });

        return () => {
            sub.unsubscribe();
            cancelled = true;

            // Call teardown on cleanup
            if (teardown) {
                teardown();
            }
        };
    }, [flow]);
}
