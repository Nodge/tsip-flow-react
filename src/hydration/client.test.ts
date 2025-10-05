import { describe, it, expect, afterEach } from "vitest";
import { createFlowHydrationManager } from "./client";
import { createFlow } from "@tsip/flow";

declare const window: {
    _FS_: Map<string, unknown> | undefined;
};

describe("createFlowHydrationManager: client", () => {
    afterEach(() => {
        // Clean up after each test
        delete window._FS_;
    });

    describe("hydrate", () => {
        it("should return undefined when window._FS_ is not defined", () => {
            const manager = createFlowHydrationManager();
            const result = manager.hydrate("test-id");

            expect(result).toBeUndefined();
        });

        it("should return undefined when window._FS_ does not have the requested id", () => {
            window._FS_ = new Map();
            const manager = createFlowHydrationManager();
            const result = manager.hydrate("non-existent-id");

            expect(result).toBeUndefined();
        });

        it("should return the value when window._FS_ has the requested id", () => {
            const testValue = { foo: "bar" };
            window._FS_ = new Map([["test-id", testValue]]);
            const manager = createFlowHydrationManager();
            const result = manager.hydrate("test-id");

            expect(result).toEqual({ value: testValue });
        });

        it("should handle multiple snapshots", () => {
            window._FS_ = new Map([
                ["id-1", "value-1"],
                ["id-2", "value-2"],
                ["id-3", "value-3"],
            ]);
            const manager = createFlowHydrationManager();

            expect(manager.hydrate("id-1")).toEqual({
                value: "value-1",
            });
            expect(manager.hydrate("id-2")).toEqual({
                value: "value-2",
            });
            expect(manager.hydrate("id-3")).toEqual({
                value: "value-3",
            });
        });

        it("should handle undefined values stored in the map", () => {
            window._FS_ = new Map([["undefined-id", undefined]]);
            const manager = createFlowHydrationManager();
            const result = manager.hydrate("undefined-id");

            expect(result).toEqual({ value: undefined });
        });
    });

    describe("register", () => {
        it("should not throw", () => {
            const manager = createFlowHydrationManager();

            expect(() => {
                manager.register("", createFlow(0), 0);
            }).not.toThrow();
        });
    });

    describe("getScript", () => {
        it("should not throw", () => {
            const manager = createFlowHydrationManager();

            expect(() => {
                manager.getScript();
            }).not.toThrow();
        });
    });

    describe("getNonce", () => {
        it("should return undefined if not set", () => {
            const manager = createFlowHydrationManager();

            expect(manager.getNonce()).toBeUndefined();
        });

        it("should return nonce from options", () => {
            const manager = createFlowHydrationManager({ cspNonce: "random-str" });

            expect(manager.getNonce()).toBe("random-str");
        });
    });
});
