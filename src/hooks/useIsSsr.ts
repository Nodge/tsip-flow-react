import { useSyncExternalStore } from "react";

/**
 * No-op subscribe function for useSyncExternalStore.
 */
const subscribe = () => () => {
    // noop
};

/**
 * Client-side snapshot that always returns false (not SSR).
 */
const getSnapshot = () => false;

/**
 * Server-side snapshot that always returns true (is SSR).
 */
const getServerSnapshot = () => true;

/**
 * Hook to detect if the code is currently running during server-side rendering (SSR).
 *
 * @returns `true` if running on the server during SSR or during hydration on the client, `false` after hydration completes
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isSsr = useIsSsr();
 *
 *   if (isSsr) {
 *     return <div>Server rendering...</div>;
 *   }
 *
 *   return <div>Client rendered!</div>;
 * }
 * ```
 */
export function useIsSsr() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
