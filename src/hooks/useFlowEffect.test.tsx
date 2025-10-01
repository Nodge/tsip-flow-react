import { describe, it, expect, afterEach, vi, expectTypeOf } from "vitest";
import { cleanup, act, renderHook } from "@testing-library/react";
import type { Flow } from "@tsip/types";
import { createFlow } from "@tsip/flow";
import { skipToken, type SkipToken } from "../skipToken";
import { useFlowEffect } from "./useFlowEffect";

describe("useFlowEffect", () => {
    afterEach(() => {
        cleanup();
    });

    describe("types behavior", () => {
        it("should infer callback parameter types", () => {
            const flow = createFlow(0);

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                useFlowEffect(flow, (value) => {
                    expectTypeOf(value).toEqualTypeOf<number>();
                });
            }
        });
    });

    describe("basic functionality", () => {
        it("should call handler with initial value on mount", async () => {
            const flow = createFlow(42);
            const handler = vi.fn();

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();

            expect(handler).toHaveBeenCalledWith(42);
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it("should call handler when flow value changes", async () => {
            const flow = createFlow(42);
            const handler = vi.fn();

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            expect(handler).toHaveBeenCalledWith(42);

            await act(async () => {
                flow.emit(108);
                await Promise.resolve();
            });

            expect(handler).toHaveBeenCalledWith(108);
            expect(handler).toHaveBeenCalledTimes(2);
        });

        it("should not call handler if snapshot is identical", async () => {
            const snapshot = { data: 42 };
            const flow = createFlow(snapshot);
            const handler = vi.fn();

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            expect(handler).toHaveBeenCalledTimes(1);

            await act(async () => {
                flow.emit(snapshot);
                await Promise.resolve();
            });

            expect(handler).toHaveBeenCalledTimes(1);
        });

        it("should call handler when snapshot reference changes", async () => {
            const snapshot = { data: 42 };
            const flow = createFlow(snapshot);
            const handler = vi.fn();

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();

            expect(handler).toHaveBeenCalledTimes(1);

            await act(async () => {
                flow.emit({ ...snapshot });
                await Promise.resolve();
            });

            expect(handler).toHaveBeenCalledTimes(2);
        });

        it("should handle undefined values", async () => {
            const flow = createFlow<number | undefined>(undefined);
            const handler = vi.fn();

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            expect(handler).toHaveBeenCalledWith(undefined);

            await act(async () => {
                flow.emit(undefined);
                await Promise.resolve();
            });
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it("should handle null values", async () => {
            const flow = createFlow<number | null>(null);
            const handler = vi.fn();

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            expect(handler).toHaveBeenCalledWith(null);

            await act(async () => {
                flow.emit(null);
                await Promise.resolve();
            });
            expect(handler).toHaveBeenCalledTimes(1);
        });
    });

    describe("handler updates", () => {
        it("should use latest handler when it changes", async () => {
            const flow = createFlow(42);
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            const { rerender } = renderHook(
                ({ handler }) => {
                    useFlowEffect(flow, handler);
                },
                {
                    initialProps: { handler: handler1 },
                },
            );

            await Promise.resolve();

            expect(handler1).toHaveBeenCalledWith(42);
            expect(handler2).not.toHaveBeenCalled();

            rerender({ handler: handler2 });

            await act(async () => {
                flow.emit(108);
                await Promise.resolve();
            });

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).toHaveBeenCalledWith(108);
            expect(handler2).toHaveBeenCalledTimes(1);
        });

        it("should not resubscribe when handler changes", () => {
            const flow = createFlow(42);
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const spy = vi.spyOn(flow, "subscribe");

            const { rerender } = renderHook(
                ({ handler }) => {
                    useFlowEffect(flow, handler);
                },
                {
                    initialProps: { handler: handler1 },
                },
            );

            expect(getSubscriptionsCount(flow)).toBe(1);

            rerender({ handler: handler2 });
            expect(getSubscriptionsCount(flow)).toBe(1);
            expect(spy).toHaveBeenCalledTimes(1);
        });
    });

    describe("flow reference changes", () => {
        it("should handle flow reference changes", async () => {
            const flow1 = createFlow(42);
            const flow2 = createFlow(108);
            const handler = vi.fn();

            const { rerender } = renderHook(
                ({ flow }) => {
                    useFlowEffect(flow, handler);
                },
                {
                    initialProps: { flow: flow1 },
                },
            );
            await Promise.resolve();

            expect(handler).toHaveBeenCalledWith(42);
            expect(getSubscriptionsCount(flow1)).toBe(1);
            expect(getSubscriptionsCount(flow2)).toBe(0);

            rerender({ flow: flow2 });
            await Promise.resolve();

            expect(handler).toHaveBeenCalledWith(108);
            expect(getSubscriptionsCount(flow1)).toBe(0);
            expect(getSubscriptionsCount(flow2)).toBe(1);
        });
    });

    describe("microtask behavior", () => {
        it("should batch multiple synchronous emissions", async () => {
            const flow = createFlow(0);
            const handler = vi.fn();

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            handler.mockClear();

            await act(async () => {
                flow.emit(1);
                flow.emit(2);
                flow.emit(3);
                await Promise.resolve();
            });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(3);
        });
    });

    describe("unmount behavior", () => {
        it("should unsubscribe on unmount", () => {
            const flow = createFlow(42);
            const handler = vi.fn();

            const { unmount } = renderHook(() => {
                useFlowEffect(flow, handler);
            });

            expect(getSubscriptionsCount(flow)).toBe(1);

            unmount();
            expect(getSubscriptionsCount(flow)).toBe(0);
        });

        it("should not call handler after unmount", async () => {
            const flow = createFlow(42);
            const handler = vi.fn();

            const { unmount } = renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            handler.mockClear();

            unmount();

            await act(async () => {
                flow.emit(108);
                await Promise.resolve();
            });

            expect(handler).not.toHaveBeenCalled();
        });

        it("should cancel scheduled microtask on unmount", async () => {
            const flow = createFlow(42);
            const handler = vi.fn();

            const { unmount } = renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            handler.mockClear();

            // Emit a value but unmount before microtask executes
            act(() => {
                flow.emit(108);
                unmount();
            });

            await Promise.resolve();
            expect(handler).not.toHaveBeenCalled();
        });
    });

    describe("skipToken behavior", () => {
        it("should not call handler when flow is skipToken", async () => {
            const handler = vi.fn();

            renderHook(() => {
                useFlowEffect(skipToken, handler);
            });

            await Promise.resolve();

            expect(handler).not.toHaveBeenCalled();
        });

        it("should handle switching from skipToken to real flow", async () => {
            const flow = createFlow(42);
            const handler = vi.fn();

            const { rerender } = renderHook(
                ({ flow }) => {
                    useFlowEffect(flow, handler);
                },
                {
                    initialProps: { flow: skipToken as Flow<number> | SkipToken },
                },
            );

            await Promise.resolve();
            expect(handler).not.toHaveBeenCalled();

            rerender({ flow });
            await Promise.resolve();

            expect(handler).toHaveBeenCalledWith(42);
            expect(handler).toHaveBeenCalledTimes(1);
        });

        it("should handle switching from real flow to skipToken", async () => {
            const flow = createFlow(42);
            const handler = vi.fn();

            const { rerender } = renderHook(
                ({ flow }) => {
                    useFlowEffect(flow, handler);
                },
                {
                    initialProps: { flow: flow as Flow<number> | typeof skipToken },
                },
            );

            await Promise.resolve();
            expect(handler).toHaveBeenCalledWith(42);
            expect(getSubscriptionsCount(flow)).toBe(1);

            rerender({ flow: skipToken });
            await Promise.resolve();

            expect(handler).toHaveBeenCalledTimes(1);
            expect(getSubscriptionsCount(flow)).toBe(0);
        });
    });

    describe("teardown callback behavior", () => {
        it("should call teardown when value changes", async () => {
            const flow = createFlow(42);
            const teardown = vi.fn();
            const handler = vi.fn(() => teardown);

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            expect(handler).toHaveBeenCalledWith(42);
            expect(teardown).not.toHaveBeenCalled();

            await act(async () => {
                flow.emit(108);
                await Promise.resolve();
            });

            expect(teardown).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(108);
            expect(handler).toHaveBeenCalledTimes(2);
        });

        it("should call teardown on unmount", async () => {
            const flow = createFlow(42);
            const teardown = vi.fn();
            const handler = vi.fn(() => teardown);

            const { unmount } = renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            expect(handler).toHaveBeenCalledWith(42);
            expect(teardown).not.toHaveBeenCalled();

            unmount();

            expect(teardown).toHaveBeenCalledTimes(1);
        });

        it("should call different teardown functions for each value", async () => {
            const flow = createFlow(1);
            const teardown1 = vi.fn();
            const teardown2 = vi.fn();
            const teardown3 = vi.fn();
            const teardowns = [teardown1, teardown2, teardown3];
            let callCount = 0;

            const handler = vi.fn(() => teardowns[callCount++]);

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            expect(handler).toHaveBeenCalledWith(1);

            await act(async () => {
                flow.emit(2);
                await Promise.resolve();
            });

            expect(teardown1).toHaveBeenCalledTimes(1);
            expect(teardown2).not.toHaveBeenCalled();
            expect(teardown3).not.toHaveBeenCalled();

            await act(async () => {
                flow.emit(3);
                await Promise.resolve();
            });

            expect(teardown1).toHaveBeenCalledTimes(1);
            expect(teardown2).toHaveBeenCalledTimes(1);
            expect(teardown3).not.toHaveBeenCalled();
        });

        it("should not call teardown if snapshot is identical", async () => {
            const snapshot = { data: 42 };
            const flow = createFlow(snapshot);
            const teardown = vi.fn();
            const handler = vi.fn(() => teardown);

            renderHook(() => {
                useFlowEffect(flow, handler);
            });

            await Promise.resolve();
            expect(handler).toHaveBeenCalledTimes(1);
            expect(teardown).not.toHaveBeenCalled();

            await act(async () => {
                flow.emit(snapshot);
                await Promise.resolve();
            });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(teardown).not.toHaveBeenCalled();
        });
    });
});

function getSubscriptionsCount(flow: Flow<unknown>): number {
    // @ts-expect-error in tests we use an implementation that allows reading the number of subscriptions
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const subscriptions: Set<unknown> = flow.subscriptions;
    return subscriptions.size;
}
