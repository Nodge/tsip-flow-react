import type { FlowHydrationManager } from "./types";

/**
 * Global window object extended with Flow hydration state.
 * @internal
 */
declare const window: {
    /**
     * Flow State - A global Map containing all hydrated state snapshots.
     * This is populated by the server-generated script during SSR.
     */
    _FS_: Map<string, unknown> | undefined;
};

/**
 * Configuration options for the client-side hydration manager.
 */
interface HydrationManagerOptions {
    /**
     * Content Security Policy nonce value for inline scripts.
     */
    cspNonce?: string;
}

/**
 * Creates a client-side hydration manager for retrieving server-rendered state.
 *
 * This manager is used in the browser to access state that was serialized on the server
 * and embedded in the HTML. It reads from the global `window._FS_` Map that is populated
 * by the script generated from {@link createServerHydrationManager}.
 *
 * @param options - Configuration options for the hydration manager
 * @returns A client-side hydration manager instance
 *
 * @example
 * ```tsx
 * import { createFlowHydrationManager, FlowHydrationProvider } from '@tsip/flow-react';
 *
 * const manager = createFlowHydrationManager();
 *
 * function App() {
 *   return (
 *     <FlowHydrationProvider manager={manager}>
 *       <YourApp />
 *     </FlowHydrationProvider>
 *   );
 * }
 * ```
 *
 * @public
 */
export function createFlowHydrationManager(options?: HydrationManagerOptions): FlowHydrationManager {
    return {
        hydrate(id) {
            const state = window._FS_;
            if (state?.has(id)) {
                return { value: state.get(id) };
            }
        },
        register() {
            // No-op on client - registration only happens on the server
        },
        getScript() {
            // Always returns null on client - script generation only happens on the server
            return null;
        },
        getNonce() {
            return options?.cspNonce;
        },
    };
}
