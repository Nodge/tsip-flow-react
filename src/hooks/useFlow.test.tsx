import { describe, expectTypeOf, it, expect, afterEach } from "vitest";
import { cleanup, act, renderHook } from "@testing-library/react";
import type { Flow } from "@tsip/types";
import { createFlow } from "@tsip/flow";
import { skipToken, type SkipToken } from "../skipToken";
import { useFlow } from "./useFlow";

declare const window: Global & {
    _FS: Map<string, unknown> | undefined;
};

describe("useFlow", () => {
    afterEach(() => {
        delete window._FS;
        cleanup();
    });

    describe("types behavior", () => {
        it("should infer return types", () => {
            const flow = createFlow(0);

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useFlow(flow);
                expectTypeOf(result).toEqualTypeOf<number>();

                const skipped = useFlow(skipToken);
                expectTypeOf(skipped).toEqualTypeOf<null>();
            }
        });

        it("should accept union with skipToken", () => {
            const flow: Flow<number> | SkipToken = createFlow(0);

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const state = useFlow(flow);

                expectTypeOf(state).toEqualTypeOf<number | null>();
            }
        });
    });

    describe("basic functionality", () => {
        it("should render initial data", () => {
            const flow = createFlow(42);

            const { result } = renderHook(() => useFlow(flow));

            expect(result.current).toBe(42);
        });

        it("should update when flow data changes", () => {
            const flow = createFlow(42);
            const { result } = renderHook(() => useFlow(flow));

            expect(result.current).toBe(42);

            act(() => {
                flow.emit(108);
            });

            expect(result.current).toBe(108);
        });

        it("should not re-render if snapshot is identical", () => {
            const snapshot = { data: 42 };
            const flow = createFlow(snapshot);
            let renderCount = 0;

            renderHook(() => {
                renderCount++;
                useFlow(flow);
            });
            expect(renderCount).toBe(1);

            act(() => {
                flow.emit(snapshot);
            });
            expect(renderCount).toBe(1);

            act(() => {
                flow.emit({ ...snapshot });
            });
            expect(renderCount).toBe(2);
        });

        it("should unsubscribe on unmount", () => {
            const flow = createFlow(42);
            const { unmount } = renderHook(() => useFlow(flow));

            expect(getSubscriptionsCount(flow)).toBe(1);

            act(() => {
                unmount();
            });

            expect(getSubscriptionsCount(flow)).toBe(0);
        });

        it("should handle flow reference changes", () => {
            const flow1 = createFlow(42);
            const flow2 = createFlow(108);
            const { result, rerender } = renderHook((flow: Flow<number>) => useFlow(flow), { initialProps: flow1 });

            expect(result.current).toBe(42);
            expect(getSubscriptionsCount(flow1)).toBe(1);
            expect(getSubscriptionsCount(flow2)).toBe(0);

            rerender(flow2);

            expect(result.current).toBe(108);
            expect(getSubscriptionsCount(flow1)).toBe(0);
            expect(getSubscriptionsCount(flow2)).toBe(1);
        });
    });

    describe("skipToken behavior", () => {
        it("should return null when skipToken is passed", () => {
            const { result } = renderHook(() => useFlow(skipToken));

            expect(result.current).toBe(null);
        });

        it("should return null when switching from flow to skipToken", () => {
            const flow = createFlow(42);
            const { result, rerender } = renderHook(useFlow, {
                initialProps: flow as Flow<number> | SkipToken,
            });

            expect(result.current).toBe(42);

            rerender(skipToken);

            expect(result.current).toBe(null);
            expect(getSubscriptionsCount(flow)).toBe(0);
        });

        it("should return data when switching from skipToken to flow", () => {
            const flow = createFlow(42);
            const { result, rerender } = renderHook((flow: Flow<number> | SkipToken) => useFlow(flow), {
                initialProps: skipToken,
            });

            expect(result.current).toBe(null);

            rerender(flow);

            expect(result.current).toBe(42);
            expect(getSubscriptionsCount(flow)).toBe(1);
        });
    });
});

function getSubscriptionsCount(flow: Flow<unknown>): number {
    // @ts-expect-error in tests we use an implementation that allows reading the number of subscriptions
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const subscriptions: Set<unknown> = flow.subscriptions;
    return subscriptions.size;
}
