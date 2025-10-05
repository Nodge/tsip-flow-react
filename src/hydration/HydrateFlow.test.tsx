import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { createFlow } from "@tsip/flow";
import { FlowHydrationProvider } from "./context";
import { createFlowHydrationManager as createServerHydrationManager } from "./server";
import { createFlowHydrationManager as createClientHydrationManager } from "./client";
import { HydrateFlow } from "./HydrateFlow";

describe("HydrateFlow", () => {
    afterEach(() => {
        cleanup();
    });

    it("should return null when no hydration manager is provided", () => {
        const flow = createFlow("test-value");
        const { container } = render(<HydrateFlow flow={flow} />);

        expect(container.innerHTML).toBe("");
    });

    it("should return null when hydration manager returns no script", () => {
        const flow = createFlow("test-value");
        const manager = createServerHydrationManager();

        const { container } = render(
            <FlowHydrationProvider manager={manager}>
                <HydrateFlow flow={flow} />
            </FlowHydrationProvider>,
        );

        expect(container.innerHTML).toBe("");
    });

    it("should render script tag when manager has registered snapshots for the flow", () => {
        const flow = createFlow("test-value");
        const manager = createServerHydrationManager();
        manager.register("test-id", flow, "test-value");

        const { container } = render(
            <FlowHydrationProvider manager={manager}>
                <HydrateFlow flow={flow} />
            </FlowHydrationProvider>,
        );

        const script = container.querySelector("script");
        expect(script).not.toBeNull();
        expect(script?.innerHTML).toContain("test-id");
        expect(script?.innerHTML).toContain("test-value");
    });

    it("should include nonce attribute when manager provides one", () => {
        const flow = createFlow("test-value");
        const manager = createServerHydrationManager({ cspNonce: "test-nonce-123" });
        manager.register("test-id", flow, "test-value");

        const { container } = render(
            <FlowHydrationProvider manager={manager}>
                <HydrateFlow flow={flow} />
            </FlowHydrationProvider>,
        );

        const script = container.querySelector("script");
        expect(script).not.toBeNull();
        expect(script?.getAttribute("nonce")).toBe("test-nonce-123");
    });

    it("should only render script for the specified flow", () => {
        const flow1 = createFlow("value-1");
        const flow2 = createFlow("value-2");
        const manager = createServerHydrationManager();
        manager.register("id-1", flow1, "value-1");
        manager.register("id-2", flow2, "value-2");

        const { container } = render(
            <FlowHydrationProvider manager={manager}>
                <HydrateFlow flow={flow1} />
            </FlowHydrationProvider>,
        );

        const script = container.querySelector("script");
        expect(script).not.toBeNull();
        expect(script?.innerHTML).toContain("id-1");
        expect(script?.innerHTML).toContain("value-1");
        expect(script?.innerHTML).not.toContain("id-2");
        expect(script?.innerHTML).not.toContain("value-2");
    });

    it("should handle multiple snapshots for the same flow", () => {
        const flow = createFlow("test-value");
        const manager = createServerHydrationManager();
        manager.register("id-1", flow, "value-1");
        manager.register("id-2", flow, "value-2");
        manager.register("id-3", flow, "value-3");

        const { container } = render(
            <FlowHydrationProvider manager={manager}>
                <HydrateFlow flow={flow} />
            </FlowHydrationProvider>,
        );

        const script = container.querySelector("script");
        expect(script).not.toBeNull();
        expect(script?.innerHTML).toContain("id-1");
        expect(script?.innerHTML).toContain("id-2");
        expect(script?.innerHTML).toContain("id-3");
    });

    it("should work with client hydration manager", () => {
        const flow = createFlow("test-value");
        const manager = createClientHydrationManager();
        manager.register("id-1", flow, "value-1");

        const { container } = render(
            <FlowHydrationProvider manager={manager}>
                <HydrateFlow flow={flow} />
            </FlowHydrationProvider>,
        );

        // Client manager doesn't generate scripts
        expect(container.innerHTML).toBe("");
    });

    it("should work with multiple HydrateFlow components for different flows", () => {
        const flow1 = createFlow("value-1");
        const flow2 = createFlow("value-2");
        const manager = createServerHydrationManager();
        manager.register("id-1", flow1, "value-1");
        manager.register("id-2", flow2, "value-2");

        const { container } = render(
            <FlowHydrationProvider manager={manager}>
                <div>
                    <HydrateFlow flow={flow1} />
                    <HydrateFlow flow={flow2} />
                </div>
            </FlowHydrationProvider>,
        );

        const scripts = container.querySelectorAll("script");
        expect(scripts.length).toBe(2);
        expect(scripts[0]?.innerHTML).toContain("id-1");
        expect(scripts[1]?.innerHTML).toContain("id-2");
    });
});
