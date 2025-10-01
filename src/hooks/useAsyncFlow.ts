import type { AsyncFlow, AsyncFlowState } from "@tsip/types";
import { useRef, useEffect, useMemo } from "react";
import { skipToken, type SkipToken } from "../skipToken";
import { useFlow } from "./useFlow";

/**
 * Options for configuring the behavior of {@link useAsyncFlow}.
 *
 * @typeParam UseSuspense - Whether to enable Suspense integration
 * @typeParam UseErrorBoundary - Whether to enable ErrorBoundary integration
 */
export interface UseAsyncFlowOptions<
    UseSuspense extends boolean = boolean,
    UseErrorBoundary extends boolean = boolean,
> {
    /**
     * Enables Suspense integration for loading states.
     *
     * When `true`, the hook will throw a promise during initial loading,
     * allowing React Suspense to handle the loading state. When `false`,
     * the hook returns a loading state object instead.
     *
     * Note: On the server side, Suspense always works regardless of this setting.
     *
     * @default true
     */
    suspense?: UseSuspense;

    /**
     * Enables ErrorBoundary integration for error states.
     *
     * When `true`, the hook will throw errors, allowing React ErrorBoundary
     * to handle them. When `false`, the hook returns an error state object instead.
     *
     * @default true
     */
    errorBoundary?: UseErrorBoundary;
}

/**
 * Represents a successful state where data has been loaded.
 *
 * @typeParam T - The type of data
 */
export interface SuccessState<T> {
    /** Indicates if this is the initial data load. Always `false` for success state. */
    isLoading: false;
    /** Indicates if an error occurred. Always `false` for success state. */
    isError: false;
    /** The cached data. In success state, this is always the current data. */
    data: T;
    /** The error that occurred. Always `undefined` for success state. */
    error: undefined;
    /** Indicates if new data is being fetched. Always `false` for success state. */
    isFetching: false;
    /** The most up-to-date data available. Same as `data` in success state. */
    currentData: T;
}

/**
 * Represents the initial loading state before any data is available.
 */
export interface LoadingState {
    /** Indicates if this is the initial data load. Always `true` for loading state. */
    isLoading: true;
    /** Indicates if an error occurred. Always `false` for loading state. */
    isError: false;
    /** The cached data. Always `undefined` during initial load. */
    data: undefined;
    /** The error that occurred. Always `undefined` for loading state. */
    error: undefined;
    /** Indicates if new data is being fetched. Always `true` for loading state. */
    isFetching: true;
    /** The most up-to-date data available. Always `undefined` during initial load. */
    currentData: undefined;
}

/**
 * Represents a state where cached data exists but new data is being fetched.
 *
 * @typeParam T - The type of data
 */
export interface UpdatingState<T> {
    /** Indicates if this is the initial data load. Always `false` for updating state. */
    isLoading: false;
    /** Indicates if an error occurred. Always `false` for updating state. */
    isError: false;
    /** The cached data from the previous successful flow state. May be stale. */
    data: T;
    /** The error that occurred. Always `undefined` for updating state. */
    error: undefined;
    /** Indicates if new data is being fetched. Always `true` for updating state. */
    isFetching: true;
    /** The most up-to-date data available. Always `undefined` while updating. */
    currentData: undefined;
}

/**
 * Represents an error state where data fetching failed.
 *
 * @typeParam T - The type of data
 */
export interface ErrorState<T> {
    /** Indicates if this is the initial data load. Always `false` for error state. */
    isLoading: false;
    /** Indicates if an error occurred. Always `true` for error state. */
    isError: true;
    /** The cached data from a previous successful flow state, if any. May be `undefined`. */
    data: T | undefined;
    /** The error that occurred during async flow loading. */
    error: unknown;
    /** Indicates if new data is being fetched. Always `false` for error state. */
    isFetching: false;
    /** The most up-to-date data available. Always `undefined` in error state. */
    currentData: undefined;
}

/**
 * The result type returned by {@link useAsyncFlow}, which varies based on options.
 *
 * The return type is determined by the `UseSuspense` and `UseErrorBoundary` options:
 * - When both are `true`: Only `SuccessState` or `UpdatingState` (errors/loading are thrown)
 * - When `UseSuspense` is `false`: Includes `LoadingState`
 * - When `UseErrorBoundary` is `false`: Includes `ErrorState`
 *
 * @typeParam T - The type of data
 * @typeParam UseSuspense - Whether Suspense is enabled
 * @typeParam UseErrorBoundary - Whether ErrorBoundary is enabled
 */
export type UseAsyncFlowResult<T, UseSuspense extends boolean, UseErrorBoundary extends boolean> = [
    UseSuspense,
] extends [true]
    ? [UseErrorBoundary] extends [true]
        ? SuccessState<T> | UpdatingState<T>
        : SuccessState<T> | UpdatingState<T> | ErrorState<T>
    : [UseErrorBoundary] extends [true]
      ? SuccessState<T> | LoadingState | UpdatingState<T>
      : SuccessState<T> | LoadingState | UpdatingState<T> | ErrorState<T>;

/**
 * Subscribes to an AsyncFlow and returns its state with Suspense and ErrorBoundary support.
 * This hook provides a React-friendly way to consume asynchronous data flows,
 * similar to react-query hooks.
 *
 * @typeParam T - The type of data in the AsyncFlow
 * @typeParam UseSuspense - Whether to enable Suspense integration (default: `true`)
 * @typeParam UseErrorBoundary - Whether to enable ErrorBoundary integration (default: `true`)
 *
 * @param flow - The AsyncFlow to subscribe to, or `skipToken` to skip subscription
 * @param options - Configuration options for Suspense and ErrorBoundary behavior
 * @returns The current state of the async operation, or `null` if `skipToken` is passed
 *
 * @example
 * Basic usage with Suspense and ErrorBoundary:
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data } = useAsyncFlow(userFlow(userId));
 *   return <div>{data.name}</div>;
 * }
 *
 * // Wrap with Suspense and ErrorBoundary
 * <Suspense fallback={<Loading />}>
 *   <ErrorBoundary fallback={<Error />}>
 *     <UserProfile userId="123" />
 *   </ErrorBoundary>
 * </Suspense>
 * ```
 *
 * @example
 * Without Suspense (manual loading state handling):
 * ```tsx
 * function UserProfile({ userId }: { userId: string }) {
 *   const { isLoading, data } = useAsyncFlow(userFlow(userId), { suspense: false });
 *
 *   if (isLoading) return <Loading />;
 *
 *   return <div>{data.name}</div>;
 * }
 * ```
 *
 * @example
 * Conditional subscription using skipToken:
 * ```tsx
 * function UserProfile({ userId }: { userId: string | null }) {
 *   const user = useAsyncFlow(
 *     userId ? userFlow(userId) : skipToken
 *   );
 *
 *   if (!user) return <div>No user</div>;
 *   return <div>{user.data.name}</div>;
 * }
 * ```
 */
export function useAsyncFlow<UseSuspense extends boolean = true, UseErrorBoundary extends boolean = true>(
    flow: SkipToken,
    options?: UseAsyncFlowOptions<UseSuspense, UseErrorBoundary>,
): null;
export function useAsyncFlow<T, UseSuspense extends boolean = true, UseErrorBoundary extends boolean = true>(
    flow: AsyncFlow<T>,
    options?: UseAsyncFlowOptions<UseSuspense, UseErrorBoundary>,
): UseAsyncFlowResult<T, UseSuspense, UseErrorBoundary>;
export function useAsyncFlow<T, UseSuspense extends boolean = true, UseErrorBoundary extends boolean = true>(
    flow: AsyncFlow<T> | SkipToken,
    options?: UseAsyncFlowOptions<UseSuspense, UseErrorBoundary>,
): UseAsyncFlowResult<T, UseSuspense, UseErrorBoundary> | null;
export function useAsyncFlow<T, UseSuspense extends boolean = true, UseErrorBoundary extends boolean = true>(
    flow: AsyncFlow<T> | SkipToken,
    options?: UseAsyncFlowOptions<UseSuspense, UseErrorBoundary>,
): UseAsyncFlowResult<T, UseSuspense, UseErrorBoundary> | null {
    const state = useFlow(flow);
    const prevStateRef = useRef(state);
    const { suspense, errorBoundary } = options ?? {};

    useEffect(() => {
        prevStateRef.current = state;
    }, [state]);

    return useMemo(() => {
        if (!state || flow === skipToken) {
            return null;
        }

        const prevState = prevStateRef.current;

        if (state.status === "pending") {
            if (!prevState || prevState.status !== "success") {
                if (state.data !== undefined) {
                    return updatingState(state.data);
                }

                if (suspense !== false) {
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw flow.asPromise();
                }

                return loadingState() as UseAsyncFlowResult<T, UseSuspense, UseErrorBoundary>;
            }

            return updatingState(prevState.data);
        }

        if (state.status === "error") {
            if (errorBoundary !== false) {
                throw state.error;
            }

            return errorState(state, prevState) as UseAsyncFlowResult<T, UseSuspense, UseErrorBoundary>;
        }

        return successState(state);
    }, [state, flow, suspense, errorBoundary]);
}

/**
 * Creates a success state object from an AsyncFlow state.
 *
 * @internal
 */
function successState<T>(state: AsyncFlowState<T> & { status: "success" }): SuccessState<T> {
    return {
        isLoading: false,
        isError: false,
        data: state.data,
        error: undefined,
        isFetching: false,
        currentData: state.data,
    };
}

/**
 * Creates a loading state object.
 *
 * @internal
 */
function loadingState(): LoadingState {
    return {
        isLoading: true,
        isError: false,
        data: undefined,
        error: undefined,
        isFetching: true,
        currentData: undefined,
    };
}

/**
 * Creates an updating state object with cached data.
 *
 * @internal
 */
function updatingState<T>(data: T): UpdatingState<T> {
    return {
        isLoading: false,
        isError: false,
        data,
        error: undefined,
        isFetching: true,
        currentData: undefined,
    };
}

/**
 * Creates an error state object from an AsyncFlow state.
 *
 * @internal
 */
function errorState<T>(
    state: AsyncFlowState<T> & { status: "error" },
    prevState: AsyncFlowState<T> | null,
): ErrorState<T> {
    return {
        isLoading: false,
        isError: true,
        data: state.data ?? prevState?.data,
        error: state.error,
        isFetching: false,
        currentData: undefined,
    };
}
