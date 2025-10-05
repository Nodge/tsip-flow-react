import serialize from "serialize-javascript";
import type { FlowHydrationManager } from "./types";
import type { Flow } from "@tsip/types";

/**
 * Configuration options for the server-side hydration manager.
 */
interface HydrationManagerOptions {
    /**
     * Content Security Policy nonce value for inline scripts.
     */
    cspNonce?: string;
}

/**
 * Creates a server-side hydration manager for serializing state to the client.
 *
 * This manager is used during server-side rendering (SSR) to collect state snapshots
 * and generate JavaScript code that transfers this state to the client. The generated
 * script initializes a global `window._FS_` Map on the client and populates it with
 * all registered state.
 *
 * The manager uses the `serialize-javascript` library to safely serialize complex
 * data structures including functions, dates, regular expressions, and undefined values.
 *
 * ## Usage Pattern
 *
 * 1. Create a manager instance for each request/render
 * 2. Register state snapshots during rendering using {@link useFlow} hook
 * 3. Call {@link FlowHydrationManager.getScript} to generate the hydration script
 * 4. Embed the script in your HTML (typically in the document head or before closing body tag)
 * 5. Repeat steps 2-4 for streaming SSR scenarios
 *
 * ## Script Generation
 *
 * The first call to `getScript()` includes core initialization code that:
 * - Creates the global `window._FS_` Map if it doesn't exist
 * - Defines a helper method `_FS_.m()` for merging state snapshots
 *
 * Subsequent calls only include the state data, allowing for efficient streaming SSR
 * where state can be flushed multiple times during rendering.
 *
 * @param options - Configuration options for the hydration manager
 * @returns A server-side hydration manager instance
 *
 * @example Initialize provider with hydration manager
 * ```tsx
 * import { createServerHydrationManager, FlowHydrationProvider } from '@tsip/flow-react';
 * import { renderToString } from 'react-dom/server';
 *
 * async function renderApp(req, res) {
 *   const manager = createServerHydrationManager();
 *
 *   const html = renderToString(
 *     <FlowHydrationProvider manager={manager}>
 *       <App />
 *     </FlowHydrationProvider>
 *   );
 *
 *   // Generate hydration script
 *   const script = manager.getScript();
 *
 *   res.send(`
 *     <!DOCTYPE html>
 *     <html>
 *       <head>
 *         ${script ? `<script>${script}</script>` : ''}
 *       </head>
 *       <body>${html}</body>
 *     </html>
 *   `);
 * }
 * ```
 *
 * @example Streaming SSR with renderToPipeableStream
 * ```tsx
 * import { FlowHydrationProvider } from '@tsip/flow-react';
 * import { createFlowHydrationManager } from '@tsip/flow-react/server';
 * import { renderToPipeableStream } from 'react-dom/server';
 * import { Writable } from 'stream';
 *
 * function streamApp(res) {
 *   const manager = createFlowHydrationManager();
 *
 *   const htmlStream = new Writable({
 *     write(chunk, encoding, callback) {
 *       // Inject hydration scripts before each chunk
 *       const script = manager.getScript();
 *       if (script) {
 *         res.write(`<script>${script}</script>`);
 *       }
 *       res.write(chunk);
 *       callback();
 *     },
 *     final(callback) {
 *       res.write(htmlCloseTag);
 *       callback();
 *     },
 *   });
 *
 *   const stream = renderToPipeableStream(
 *     <FlowHydrationProvider manager={manager}>
 *       <App />
 *     </FlowHydrationProvider>,
 *     {
 *       onShellReady() {
 *         res.status(200);
 *         res.setHeader('Content-Type', 'text/html');
 *         res.write(htmlHead);
 *         stream.pipe(htmlStream);
 *       },
 *       onShellError(error) {
 *         res.statusCode = 500;
 *         res.send('Server Error');
 *       },
 *     }
 *   );
 *
 *   htmlStream.on('finish', () => {
 *     res.end();
 *   });
 * }
 * ```
 *
 * @public
 */
export function createFlowHydrationManager(options?: HydrationManagerOptions): FlowHydrationManager {
    /**
     * Internal state map storing registered snapshots.
     * Cleared after each `getScript()` call to prevent duplicate serialization.
     */
    const hydrationQueue = new Map<string, unknown>();

    /**
     * Maps Flow instances to the set of hook IDs that have registered with them.
     * Used to track which state snapshots belong to which Flow for selective script generation.
     */
    const flowHooks = new Map<Flow<unknown>, Set<string>>();

    /**
     * Maps state values to the set of hook IDs that share that value.
     * Used for deduplication - when multiple hooks have the same value, we only
     * serialize it once and reference it from other locations using the `_FS_.d()` method.
     */
    const cache = new Map<unknown, Set<string>>();

    /**
     * Tracks the last value sent for each hook ID.
     * Used to detect when a value has changed between script generations, allowing
     * us to clean up old cache entries and prevent stale deduplication references.
     */
    const sentValues = new Map<string, unknown>();

    /**
     * Tracks whether the core initialization code has been emitted.
     * The core code only needs to be included in the first script output.
     */
    let coreHasBeenEmitted = false;

    return {
        hydrate() {
            // Always returns undefined on server - hydration only happens on the client
            return undefined;
        },
        register(id, flow, value) {
            hydrationQueue.set(id, value);

            if (flowHooks.has(flow)) {
                flowHooks.get(flow)?.add(id);
            } else {
                flowHooks.set(flow, new Set([id]));
            }
        },
        getScript(flow) {
            if (hydrationQueue.size === 0) {
                return null;
            }

            const filter = flow ? flowHooks.get(flow) : null;
            if (flow && !filter) {
                return null;
            }

            const queue = filter ? new Map<string, unknown>() : hydrationQueue;
            const dedupe: string[][] = [];

            for (const [id, value] of hydrationQueue) {
                if (filter && !filter.has(id)) {
                    continue;
                }

                if (filter) {
                    queue.set(id, value);
                    hydrationQueue.delete(id);
                }

                const sentValue = sentValues.get(id);
                if (sentValue && sentValue !== value) {
                    cache.get(sentValue)?.delete(id);
                }

                const cachedId = cache.get(value)?.values().next().value;
                if (cachedId) {
                    if (cachedId !== id) {
                        dedupe.push([cachedId, id]);
                    }
                    queue.delete(id);
                } else {
                    sentValues.set(id, value);
                }

                if (cache.has(value)) {
                    cache.get(value)?.add(id);
                } else {
                    cache.set(value, new Set([id]));
                }
            }

            const script: string[] = [];

            if (queue.size > 0) {
                script.push(`_FS_.m(${serialize(queue)});`);
            }
            if (dedupe.length > 0) {
                script.push(`_FS_.d(${serialize(dedupe)});`);
            }

            if (flow) {
                flowHooks.delete(flow);
            } else {
                hydrationQueue.clear();
                flowHooks.clear();
            }

            if (script.length === 0) {
                return null;
            }

            if (!coreHasBeenEmitted) {
                script.unshift(getCoreScript());
                coreHasBeenEmitted = true;
            }

            return script.join("");
        },
        getNonce() {
            return options?.cspNonce;
        },
    };
}

function getCoreScript(): string {
    // Minified inline script with core hydration functionality
    return [
        // Start closure
        "(()=>{",

        // Initialize global variable to store server data
        "var c,n,w=self,s='_FS_';",
        "w[s]||(w[s]=new Map);",

        // Delete current hydration script because client-side rendering will not render those scripts, leading to hydration mismatch if not deleted
        "c=c=>{",
        "(n=document.currentScript)&&n.remove()",
        "};",

        // Append new hydration values to global variable
        "w[s].m=r=>{",
        "for(var[k,v]of r)w[s].set(k,v);",
        "c()",
        "};",

        // Append existing values to global variable
        "w[s].d=r=>{",
        "for(var[f,t]of r)w[s].set(t,w[s].get(f));",
        "c()",
        "}",

        // End closure
        "})();",
    ].join("");
}
