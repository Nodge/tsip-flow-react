import type { Flow } from "@tsip/types";
import { useHydration } from "./context";

/**
 * Props for the {@link HydrateFlow} component.
 */
export interface HydrateFlowProps {
    /**
     * The Flow instance to generate hydration script for.
     * Only snapshots registered for this specific flow will be included in the script.
     */
    flow: Flow<unknown>;
}

/**
 * Component that renders a hydration script for a specific Flow instance.
 *
 * This component generates and injects a `<script>` tag containing the serialized state
 * for the given flow. It retrieves the hydration manager from context and generates
 * a script that will restore the flow's state on the client side.
 *
 * The component returns `null` if:
 * - No hydration manager is available in context
 * - No script is generated (no snapshots registered for this flow)
 *
 * ## Usage
 *
 * Place this component where you want the hydration script to be injected in your HTML:
 * ```tsx
 * import { useFlow, HydrateFlow } from '@tsip/flow-react';
 * import { userNameFlow } from './flows';
 *
 * function MyComponent() {
 *   const name = useFlow(userNameFlow);
 *   return (
 *     <div>
 *       <h1>{name}</h1>
 *       <HydrateFlow flow={userNameFlow} />
 *     </div>
 *   );
 * }
 * ```
 *
 * @param props - Component props
 * @returns A script element with hydration code, or `null` if no script is needed
 */
export function HydrateFlow(props: HydrateFlowProps) {
    const hydration = useHydration();
    const script = hydration?.getScript(props.flow);
    if (!script || !hydration) {
        return null;
    }

    return <script dangerouslySetInnerHTML={{ __html: script }} nonce={hydration.getNonce()}></script>;
}
