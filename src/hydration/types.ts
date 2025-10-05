import type { Flow } from "@tsip/types";

/**
 * Manages hydration of server-side state to the client.
 *
 * This interface provides methods for registering state snapshots on the server,
 * retrieving them on the client, and generating the necessary JavaScript code
 * to transfer state between server and client during SSR (Server-Side Rendering).
 *
 * @public
 */
export interface FlowHydrationManager {
    /**
     * Retrieves a previously registered state snapshot by its ID.
     *
     * On the server, this always returns `undefined` since hydration only occurs on the client.
     * On the client, this retrieves the state from the global `window._FS_` Map if it exists.
     *
     * @param id - The unique identifier for the state snapshot
     * @returns An object containing the state value if found, otherwise `undefined`
     *
     * @example
     * ```ts
     * const result = manager.hydrate('user-data');
     * if (result) {
     *   console.log(result.value); // The hydrated state
     * }
     * ```
     */
    hydrate(id: string): { value: unknown } | undefined;

    /**
     * Registers a state snapshot to be hydrated on the client.
     *
     * @param id - A unique identifier for this state snapshot
     * @param flow - The Flow instance associated with this state snapshot, used to track which snapshots belong to which flows for selective script generation
     * @param value - The state value to be hydrated (must be serializable)
     *
     * @example
     * ```ts
     * manager.register('user-data', userFlow, { name: 'John', age: 30 });
     * ```
     */
    register<T>(id: string, flow: Flow<T>, value: NoInfer<T>): void;

    /**
     * Generates JavaScript code to transfer registered state to the client.
     *
     * After returning the script, the internal state is cleared to prevent duplicate serialization.
     *
     * @param flow - Optional Flow instance to generate script for only the snapshots associated with that specific flow. If omitted, generates script for all registered snapshots.
     * @returns A JavaScript code string if there are registered snapshots, otherwise `null`
     *
     * @example
     * ```tsx
     * // In your server-side rendering
     * manager.register('user-data', userFlow, userData);
     * const script = manager.getScript();
     * if (script) {
     *   return <script dangerouslySetInnerHTML={{ __html: script }} />;
     * }
     * ```
     *
     * @example Generate script for specific flow
     * ```tsx
     * // Generate script only for a specific flow's snapshots
     * const userScript = manager.getScript(userFlow);
     * ```
     */
    getScript(flow?: Flow<unknown>): string | null;

    /**
     * Retrieves the Content Security Policy (CSP) nonce value if configured.
     *
     * This nonce can be used in script tags to satisfy CSP requirements when
     * embedding the hydration script in the HTML document.
     *
     * @returns The CSP nonce string if configured, otherwise `undefined`
     *
     * @example
     * ```tsx
     * const nonce = manager.getNonce();
     * const script = manager.getScript();
     * if (script) {
     *   return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} />;
     * }
     * ```
     */
    getNonce(): string | undefined;
}
