import type { AsyncFlow, AsyncFlowState } from "@tsip/types";
import { useEffect, useMemo } from "react";
import { skipToken, type SkipToken } from "../skipToken";
import { useFlow } from "./useFlow";
import { useIsSsr } from "./useIsSsr";

/**
 * A function that accesses and returns the current data from an AsyncFlow.
 *
 * @typeParam T - The type of data being accessed
 * @throws A promise (for Suspense) or an error (for ErrorBoundary).
 */
export type UseAsyncFlowAccessor<T> = () => T;

/**
 * Represents a successful state where data has been loaded.
 */
export interface SuccessState<T> {
    /** Indicates if this is the initial data load. Always `false` for success state. */
    isLoading: false;
    /** Indicates if an error occurred. Always `false` for success state. */
    isError: false;
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
    /** The error that occurred. Always `undefined` for loading state. */
    error: undefined;
    /** Indicates if new data is being fetched. Always `true` for loading state. */
    isFetching: true;
    /** The most up-to-date data available. Always `undefined` during initial load. */
    currentData: undefined;
}

/**
 * Represents a state where cached data exists but new data is being fetched.
 */
export interface UpdatingState {
    /** Indicates if this is the initial data load. Always `false` for updating state. */
    isLoading: false;
    /** Indicates if an error occurred. Always `false` for updating state. */
    isError: false;
    /** The error that occurred. Always `undefined` for updating state. */
    error: undefined;
    /** Indicates if new data is being fetched. Always `true` for updating state. */
    isFetching: true;
    /** The most up-to-date data available. Always `undefined` while updating. */
    currentData: undefined;
}

/**
 * Represents an error state where data fetching failed.
 */
export interface ErrorState<T> {
    /** Indicates if this is the initial data load. Always `false` for error state. */
    isLoading: false;
    /** Indicates if an error occurred. Always `true` for error state. */
    isError: true;
    /** The error that occurred during async flow loading. */
    error: unknown;
    /** Indicates if new data is being fetched. Always `false` for error state. */
    isFetching: false;
    /** The most up-to-date data available. */
    currentData: T | undefined;
}

/**
 * Represents a skipped state when `skipToken` is passed to the hook.
 */
export interface SkippedState {
    /** Indicates if this is the initial data load. Always `false` for skipped state. */
    isLoading: false;
    /** Indicates if an error occurred. Always `false` for skipped state. */
    isError: false;
    /** The error that occurred. Always `undefined` for skipped state. */
    error: undefined;
    /** Indicates if new data is being fetched. Always `false` for skipped state. */
    isFetching: false;
    /** The most up-to-date data available. Always `undefined` for skipped state. */
    currentData: undefined;
}

/**
 * A union type representing all possible states of an async flow operation.
 *
 * @typeParam T - The type of data being managed by the async flow
 *
 * @see {@link UseAsyncFlowResult} for the complete return type of the hook
 */
export type UseAsyncFlowState<T> = SuccessState<T> | LoadingState | UpdatingState | ErrorState<T>;

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
export type UseAsyncFlowResult<T> = [UseAsyncFlowAccessor<T>, UseAsyncFlowState<T>];

/**
 * Stores the previous state of each AsyncFlow to enable proper state transitions.
 * This is used to determine if a pending state should be treated as an update
 * (when previous data exists) or initial loading (when no previous data exists).
 */
const previousStates = new WeakMap<AsyncFlow<unknown>, AsyncFlowState<unknown>>();

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
export function useAsyncFlow(flow: SkipToken): [null, SkippedState];
export function useAsyncFlow<T>(flow: AsyncFlow<T>): UseAsyncFlowResult<T>;
export function useAsyncFlow<T>(flow: AsyncFlow<T> | SkipToken): UseAsyncFlowResult<T> | [null, SkippedState];
export function useAsyncFlow<T>(flow: AsyncFlow<T> | SkipToken): UseAsyncFlowResult<T> | [null, SkippedState] {
    const state = useFlow(flow);
    const isSsr = useIsSsr();

    useEffect(() => {
        if (flow !== skipToken && state) {
            previousStates.set(flow, state);
        }
    }, [flow, state]);

    const reader = useMemo(() => {
        if (!state || flow === skipToken) {
            return null;
        }

        return (): T => {
            let readerState = state;

            const isServer = typeof window === "undefined";
            const isHydration = isSsr && !isServer;
            if (!isHydration) {
                // During hydration, we must use the frozen state from the useFlow() hook to avoid hydration errors,
                // but otherwise we want the most recent state of the flow
                readerState = flow.getSnapshot();
            }

            const prevState = previousStates.get(flow) as AsyncFlowState<T> | undefined;

            if (readerState.status === "pending") {
                if (prevState && prevState.status === "success") {
                    return prevState.data;
                }

                if (readerState.data !== undefined) {
                    return readerState.data;
                }

                const isServer = typeof window === "undefined";
                const isHydration = isSsr && !isServer;
                if (isHydration) {
                    // A pending state during the hydration process leads to an infinite loading state and should not occur in normal operation
                    throw new Error("Unexpected pending state for async flow during component hydration");
                }

                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw flow.asPromise();
            }

            if (readerState.status === "error" && readerState.data === undefined) {
                throw readerState.error;
            }

            return readerState.data as T;
        };
    }, [flow, state, isSsr]);

    const result = useMemo(() => {
        if (!state || flow === skipToken) {
            return skippedState();
        }

        const prevState = previousStates.get(flow);

        if (state.status === "pending") {
            if (prevState && prevState.status === "success") {
                return updatingState();
            }

            if (state.data !== undefined) {
                return updatingState();
            }

            return isSsr ? updatingState() : loadingState();
        }

        if (state.status === "error") {
            return errorState(state);
        }

        return successState(state);
    }, [state, flow, isSsr]);

    return useMemo(() => {
        return [reader, result] as UseAsyncFlowResult<T>;
    }, [reader, result]);
}

/**
 * Creates a success state object from an AsyncFlow state.
 *
 * @typeParam T - The type of data in the state
 * @param state - The AsyncFlow state with success status
 * @returns A success state object
 * @internal
 */
function successState<T>(state: AsyncFlowState<T> & { status: "success" }): SuccessState<T> {
    return {
        isLoading: false,
        isError: false,
        error: undefined,
        isFetching: false,
        currentData: state.data,
    };
}

/**
 * Creates a loading state object for initial data load.
 *
 * @returns A loading state object
 * @internal
 */
function loadingState(): LoadingState {
    return {
        isLoading: true,
        isError: false,
        error: undefined,
        isFetching: true,
        currentData: undefined,
    };
}

/**
 * Creates an updating state object when fetching new data while cached data exists.
 *
 * @returns An updating state object
 * @internal
 */
function updatingState(): UpdatingState {
    return {
        isLoading: false,
        isError: false,
        error: undefined,
        isFetching: true,
        currentData: undefined,
    };
}

/**
 * Creates an error state object from an AsyncFlow state.
 *
 * @typeParam T - The type of data in the state
 * @param state - The AsyncFlow state with error status
 * @returns An error state object
 * @internal
 */
function errorState<T>(state: AsyncFlowState<T> & { status: "error" }): ErrorState<T> {
    return {
        isLoading: false,
        isError: true,
        error: state.error,
        isFetching: false,
        currentData: state.data,
    };
}

/**
 * Creates a skipped state object when `skipToken` is passed.
 *
 * @returns A skipped state object
 * @internal
 */
function skippedState(): SkippedState {
    return {
        isLoading: false,
        isError: false,
        error: undefined,
        isFetching: false,
        currentData: undefined,
    };
}
