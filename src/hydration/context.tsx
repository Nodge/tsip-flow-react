import { createContext, useContext, type ReactNode } from "react";
import type { FlowHydrationManager } from "./types";

/**
 * React context for providing the hydration manager throughout the component tree.
 * @internal
 */
const context = createContext<FlowHydrationManager | null>(null);

/**
 * Props for the {@link FlowHydrationProvider} component.
 */
export interface FlowHydrationProviderProps {
    /**
     * The hydration manager instance to provide to the component tree.
     * Use {@link createClientHydrationManager} on the client or
     * {@link createServerHydrationManager} on the server.
     */
    manager: FlowHydrationManager;

    /**
     * Child components that will have access to the hydration manager.
     */
    children: ReactNode;
}

/**
 * Provider component that makes a hydration manager available to all child components.
 *
 * This component should wrap your application at the root level to enable hydration
 * functionality throughout your component tree. Use {@link useHydration} in child
 * components to access the manager.
 *
 * ## Usage
 *
 * On the client, provide a client hydration manager:
 * ```tsx
 * import { createClientHydrationManager, FlowHydrationProvider } from '@tsip/flow-react';
 *
 * const manager = createClientHydrationManager();
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
 * On the server, provide a server hydration manager:
 * ```tsx
 * import { createServerHydrationManager, FlowHydrationProvider } from '@tsip/flow-react';
 * import { renderToString } from 'react-dom/server';
 *
 * function renderApp() {
 *   const manager = createServerHydrationManager();
 *
 *   const html = renderToString(
 *     <FlowHydrationProvider manager={manager}>
 *       <YourApp />
 *     </FlowHydrationProvider>
 *   );
 *
 *   return { html, script: manager.getScript() };
 * }
 * ```
 *
 * @param props - Component props
 * @returns The provider component
 */
export function FlowHydrationProvider({ manager, children }: FlowHydrationProviderProps) {
    return <context.Provider value={manager}>{children}</context.Provider>;
}

/**
 * Hook to access the hydration manager from the React context.
 *
 * This hook retrieves the {@link FlowHydrationManager} instance provided by the nearest
 * {@link FlowHydrationProvider} ancestor. It returns `null` if no provider is found in
 * the component tree.
 *
 * @returns The hydration manager instance, or `null` if no provider is found
 *
 * @internal
 */
export function useHydration(): FlowHydrationManager | null {
    return useContext(context);
}
