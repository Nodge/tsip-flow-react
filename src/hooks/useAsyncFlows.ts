import type { AsyncFlow } from "@tsip/types";
import { useAsyncFlow, type UseAsyncFlowResult } from "./useAsyncFlow";
import { skipToken, type SkipToken } from "../skipToken";
import { useEffect, useRef } from "react";

/**
 * Options for configuring the behavior of {@link useAsyncFlows}.
 *
 * @typeParam UseErrorBoundary - Whether to enable ErrorBoundary integration
 */
export interface UseAsyncFlowsOptions<UseErrorBoundary extends boolean = boolean> {
    /**
     * Enables ErrorBoundary integration for error states.
     *
     * When `true`, the hook will throw errors, allowing React ErrorBoundary
     * to handle them. When `false`, the hook returns error state objects instead.
     *
     * @default true
     */
    errorBoundary?: UseErrorBoundary;
}

/**
 * The result type for {@link useAsyncFlows}, which is a tuple matching the input flows array.
 *
 * @typeParam T - Array of AsyncFlow instances or SkipToken
 * @typeParam UseErrorBoundary - Whether ErrorBoundary is enabled
 */
export type UseAsyncFlowsResult<
    T extends (AsyncFlow<unknown> | SkipToken)[],
    UseErrorBoundary extends boolean = true,
> = {
    [Key in keyof T]: UseAsyncFlowsResultItem<T[Key], UseErrorBoundary>;
};

/**
 * Maps a single flow to its result type.
 *
 * @typeParam T - An AsyncFlow instance or SkipToken
 * @typeParam UseErrorBoundary - Whether ErrorBoundary is enabled
 * @internal
 */
type UseAsyncFlowsResultItem<T, UseErrorBoundary extends boolean = true> =
    T extends AsyncFlow<infer R> ? UseAsyncFlowResult<R, true, UseErrorBoundary> : null;

/**
 * This hook enables parallel loading of multiple async flows while working with React Suspense.
 * Without this hook, using multiple `useAsyncFlow` calls would create a waterfall effect,
 * as each would throw its promise sequentially. This hook collects all pending promises, allowing parallel loading.
 *
 * Note: Suspense is always enabled for this hook. Use the `suspense: false` option
 * on individual `useAsyncFlow` calls if you need manual loading state handling.
 *
 * @typeParam T - Array type of AsyncFlow instances or SkipToken
 * @typeParam UseErrorBoundary - Whether to enable ErrorBoundary integration (default: `true`)
 *
 * @param flows - Array of AsyncFlow instances to subscribe to (or `skipToken` to skip)
 * @param options - Configuration options for ErrorBoundary behavior
 * @returns Array of flow states matching the input array structure
 *
 * @throws {Error} If the number of flows changes between renders (violates Rules of Hooks)
 *
 * @example
 * Basic usage with multiple flows:
 * ```tsx
 * function Dashboard() {
 *   const [user, posts, comments] = useAsyncFlows([
 *     userFlow,
 *     postsFlow,
 *     commentsFlow
 *   ]);
 *
 *   return (
 *     <div>
 *       <h1>{user.data.name}</h1>
 *       <Posts data={posts.data} />
 *       <Comments data={comments.data} />
 *     </div>
 *   );
 * }
 *
 * // Wrap with Suspense and ErrorBoundary
 * <Suspense fallback={<Loading />}>
 *   <ErrorBoundary fallback={<Error />}>
 *     <Dashboard />
 *   </ErrorBoundary>
 * </Suspense>
 * ```
 *
 * @example
 * Conditional flows using skipToken:
 * ```tsx
 * function UserDashboard({ userId }: { userId: string | null }) {
 *   const [user, posts] = useAsyncFlows([
 *     userId ? userFlow(userId) : skipToken,
 *     userId ? postsFlow(userId) : skipToken
 *   ]);
 *
 *   if (!user || !posts) {
 *     return <div>No user selected</div>;
 *   }
 *
 *   return (
 *     <div>
 *       <h1>{user.data.name}</h1>
 *       <Posts data={posts.data} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @example
 * Without ErrorBoundary (manual error handling):
 * ```tsx
 * function Dashboard() {
 *   const [user, posts] = useAsyncFlows(
 *     [userFlow, postsFlow],
 *     { errorBoundary: false }
 *   );
 *
 *   if (user.isError) return <Error error={user.error} />;
 *   if (posts.isError) return <Error error={posts.error} />;
 *
 *   return (
 *     <div>
 *       <h1>{user.data.name}</h1>
 *       <Posts data={posts.data} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useAsyncFlows<
    const T extends (AsyncFlow<unknown> | SkipToken)[],
    UseErrorBoundary extends boolean = true,
>(flows: T, options?: UseAsyncFlowsOptions<UseErrorBoundary>): UseAsyncFlowsResult<T, UseErrorBoundary> {
    const lengthRef = useRef(flows.length);
    const hasBeenMountedRef = useRef(false);

    if (lengthRef.current !== flows.length) {
        throw new Error(
            "useAsyncFlows: The number of flows changed between renders. This violates the Rules of Hooks and will cause rendering issues.",
        );
    }

    const promises: Promise<unknown>[] = [];
    for (const flow of flows) {
        if (flow === skipToken) {
            break;
        }

        const state = flow.getSnapshot();

        if (state.status === "pending") {
            if (!hasBeenMountedRef.current) {
                if (state.data !== undefined) {
                    break;
                }

                promises.push(flow.asPromise());
            }
        }
    }

    if (promises.length > 0) {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw Promise.all(promises);
    }

    useEffect(() => {
        hasBeenMountedRef.current = true;
    }, []);

    const result = flows.map((flow) => useAsyncFlow(flow, { errorBoundary: options?.errorBoundary }));
    return result as UseAsyncFlowsResult<T, UseErrorBoundary>;
}
