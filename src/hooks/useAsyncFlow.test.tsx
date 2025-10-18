import { Writable } from "stream";
import { describe, expectTypeOf, it, expect, afterEach, vi } from "vitest";
import { Suspense, Component, type ReactNode, type ReactElement, useState } from "react";
import { render, screen, cleanup, act, renderHook, waitFor } from "@testing-library/react";
import { renderToPipeableStream } from "react-dom/server";
import type { AsyncFlow, Flow } from "@tsip/types";
import { createAsyncFlow } from "@tsip/flow";
import { skipToken, type SkipToken } from "../skipToken";
import { FlowHydrationProvider } from "../hydration/context";
import { createFlowHydrationManager as createServerHydrationManager } from "../hydration/server";
import { createFlowHydrationManager as createClientHydrationManager } from "../hydration/client";
import type { FlowHydrationManager } from "../hydration/types";
import {
    useAsyncFlow,
    type ErrorState,
    type LoadingState,
    type SkippedState,
    type SuccessState,
    type UpdatingState,
    type UseAsyncFlowResult,
} from "./useAsyncFlow";
import { useFlow } from "./useFlow";

declare const window: Global & {
    _FS_: Map<string, unknown> | undefined;
};

declare function random(): boolean;

const originalWindow = globalThis.window;

describe("useAsyncFlow", () => {
    afterEach(() => {
        cleanup();
        globalThis.window = originalWindow;
        delete window._FS_;
    });

    describe("types behavior", () => {
        it("should infer return types", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const [data, state] = useAsyncFlow(flow);
                expectTypeOf(data).toEqualTypeOf<() => number>();
                expectTypeOf(state).toEqualTypeOf<
                    // success state
                    | {
                          isLoading: false;
                          isError: false;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    // loading state
                    | {
                          isLoading: true;
                          isError: false;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    // updating state
                    | {
                          isLoading: false;
                          isError: false;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    // error state
                    | {
                          isLoading: false;
                          isError: true;
                          error: unknown;
                          isFetching: false;
                          currentData: number | undefined;
                      }
                >();
            }
        });

        it("should inter return types with skip token", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const [data, state] = useAsyncFlow(random() ? flow : skipToken);
                expectTypeOf(data).toEqualTypeOf<(() => number) | null>();
                expectTypeOf(state).toEqualTypeOf<
                    // success state
                    | {
                          isLoading: false;
                          isError: false;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    // loading state
                    | {
                          isLoading: true;
                          isError: false;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    // updating state
                    | {
                          isLoading: false;
                          isError: false;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    // error state
                    | {
                          isLoading: false;
                          isError: true;
                          error: unknown;
                          isFetching: false;
                          currentData: number | undefined;
                      }
                    // skipped state
                    | {
                          isLoading: false;
                          isError: false;
                          error: undefined;
                          isFetching: false;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should narrow types for currentData", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const [, { isLoading, isFetching, isError, currentData }] = useAsyncFlow(flow);

                expectTypeOf(currentData).toEqualTypeOf<number | undefined>();

                if (isLoading) {
                    expectTypeOf(currentData).toEqualTypeOf<undefined>();
                    return "loading";
                }

                if (isFetching) {
                    expectTypeOf(currentData).toEqualTypeOf<undefined>();
                    return "updating";
                }

                if (isError) {
                    expectTypeOf(currentData).toEqualTypeOf<number | undefined>();
                    return "error";
                }

                expectTypeOf(currentData).toEqualTypeOf<number>();
            }
        });

        it("should narrow types for error", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const [, { isLoading, isFetching, isError, error }] = useAsyncFlow(flow);

                expectTypeOf(error).toEqualTypeOf<unknown>();

                if (isLoading) {
                    expectTypeOf(error).toEqualTypeOf<undefined>();
                    return "loading";
                }

                if (isFetching) {
                    expectTypeOf(error).toEqualTypeOf<undefined>();
                    return "updating";
                }

                if (isError) {
                    expectTypeOf(error).toEqualTypeOf<unknown>();
                    return "updating";
                }

                expectTypeOf(error).toEqualTypeOf<undefined>();
            }
        });

        it("should accept union with skipToken", () => {
            const flow: AsyncFlow<number> | SkipToken = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const [, state] = useAsyncFlow(flow);

                expectTypeOf(state).toEqualTypeOf<
                    SuccessState<number> | LoadingState | UpdatingState | ErrorState<number> | SkippedState
                >();
            }
        });
    });

    describe("basic functionality", () => {
        it("should render initial success data", () => {
            const flow = createAsyncFlow({ status: "success", data: 42 });

            render(<Screen flow={flow} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");
        });

        it("should update when flow state changes", () => {
            const flow = createAsyncFlow({ status: "success", data: 42 });

            render(<Screen flow={flow} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            act(() => {
                flow.emit({ status: "pending" });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("2");

            act(() => {
                flow.emit({ status: "success", data: 108 });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("108");
            expect(screen.getByTestId("current-data")).toHaveTextContent("108");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("3");
        });

        it("should not re-render if snapshot is identical", () => {
            const snapshot = { status: "success" as const, data: 42 };
            const flow = createAsyncFlow<number>(snapshot);

            render(<Screen flow={flow} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            act(() => {
                flow.emit(snapshot);
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");
        });

        it("should unsubscribe on unmount", () => {
            const flow = createAsyncFlow({ status: "success", data: 42 });

            const { unmount } = render(<Screen flow={flow} />);
            expect(getSubscriptionsCount(flow)).toBe(2);

            act(() => {
                unmount();
            });

            expect(getSubscriptionsCount(flow)).toBe(0);
        });

        it("should return stable reference", () => {
            const flow = createAsyncFlow({ status: "success", data: 42 });

            const { result, rerender } = renderHook(() => useAsyncFlow(flow));

            const firstResult = result.current;
            const [data, state] = result.current;
            expect(state.isLoading).toBe(false);
            expect(state.isError).toBe(false);
            expect(state.isFetching).toBe(false);
            expect(data()).toBe(42);
            expect(state.currentData).toBe(42);
            expect(state.error).toBeUndefined();

            // Force re-render without changing flow or state
            rerender();

            const secondResult = result.current;
            expect(secondResult).toBe(firstResult);
            expect(secondResult[0]).toBe(data);
            expect(secondResult[1]).toBe(state);
        });

        it("should handle flow reference changes", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 42 });
            const flow2 = createAsyncFlow({ status: "success", data: 108 });

            const { rerender } = render(<Screen flow={flow1} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");
            expect(getSubscriptionsCount(flow1)).toBe(2);
            expect(getSubscriptionsCount(flow2)).toBe(0);

            rerender(<Screen flow={flow2} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("108");
            expect(screen.getByTestId("current-data")).toHaveTextContent("108");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("2");
            expect(getSubscriptionsCount(flow1)).toBe(0);
            expect(getSubscriptionsCount(flow2)).toBe(2);
        });
    });

    describe("suspense behavior", () => {
        describe("with accessor function", () => {
            it("should throw promise for initial pending state", () => {
                const flow = createAsyncFlow({ status: "pending" });

                render(<Screen flow={flow} />);

                expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("suspense-fallback.is-loading")).toHaveTextContent("true");
                expect(screen.getByTestId("suspense-fallback.is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("suspense-fallback.is-fetching")).toHaveTextContent("true");
                expect(screen.getByTestId("suspense-fallback.current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("suspense-fallback.error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("suspense-fallback.render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "success", data: 42 });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("42");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("3");
            });

            it("should not throw for initial pending state if state.data is defined", () => {
                const flow = createAsyncFlow({ status: "pending", data: 42 });

                render(<Screen flow={flow} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "success", data: 108 });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("108");
                expect(screen.getByTestId("current-data")).toHaveTextContent("108");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("2");
            });

            it("should not throw for initial success state", () => {
                const flow = createAsyncFlow({ status: "success", data: 42 });

                render(<Screen flow={flow} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("42");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");
            });

            it("should not throw for subsequent pending state", () => {
                const flow = createAsyncFlow({ status: "success", data: 42 });

                render(<Screen flow={flow} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("42");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "pending" });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("2");

                act(() => {
                    flow.emit({ status: "success", data: 108 });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("108");
                expect(screen.getByTestId("current-data")).toHaveTextContent("108");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("3");
            });

            it("should throw promise when switching from skipToken to pending flow", async () => {
                const flow = createAsyncFlow({ status: "pending" });

                const { rerender } = render(<Screen flow={skipToken} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");

                rerender(<Screen flow={flow} />);

                expect(await screen.findByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("suspense-fallback.render-count")).toHaveTextContent("2");

                act(() => {
                    flow.emit({ status: "success", data: 108 });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("108");
                expect(screen.getByTestId("current-data")).toHaveTextContent("108");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("4");
            });
        });

        describe("with isLoading flag", () => {
            it("should return loading state for initial pending", () => {
                const flow = createAsyncFlow({ status: "pending" });

                render(<Screen flow={flow} suspense={false} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "success", data: 42 });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("42");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("2");
            });

            it("should return loading state when switching from skipToken to pending flow", () => {
                const flow = createAsyncFlow({ status: "pending" });

                const { rerender } = render(<Screen flow={skipToken} suspense={false} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");

                rerender(<Screen flow={flow} suspense={false} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("2");

                act(() => {
                    flow.emit({ status: "success", data: 108 });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("108");
                expect(screen.getByTestId("current-data")).toHaveTextContent("108");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("3");
            });

            it("should not return loading state when running on server", async () => {
                // @ts-expect-error emulate serder-side env
                delete globalThis.window;

                const flow = createAsyncFlow({ status: "pending" });

                const renderPromise = renderToString(
                    <main>
                        <Screen flow={flow} suspense={false} />
                    </main>,
                    createServerHydrationManager(),
                );

                // should wait for the first render to finish
                await Promise.resolve();

                act(() => {
                    flow.emit({ status: "success", data: "server value" });
                });

                const { html } = await renderPromise;

                expect(html).toMatchInlineSnapshot(
                    `
                  "<main><!--$?--><template id="B:0"></template><div data-testid="suspense-fallback">Loading...</div><div data-testid="suspense-fallback.is-loading">false</div><div data-testid="suspense-fallback.is-error">false</div><div data-testid="suspense-fallback.is-fetching">true</div><div data-testid="suspense-fallback.current-data">undefined</div><div data-testid="suspense-fallback.error">undefined</div><div data-testid="suspense-fallback.render-count">1</div><!--/$--></main><script>requestAnimationFrame(function(){$RT=performance.now()});</script><div hidden id="S:0"><div data-testid="is-loading">false</div><div data-testid="is-error">false</div><div data-testid="is-fetching">false</div><div data-testid="current-data">server value</div><div data-testid="error">undefined</div><div data-testid="render-count">2</div><div data-testid="data">server value</div></div><script>$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
                  $RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};$RC("B:0","S:0")</script>"
                `,
                );

                expect(html).toContain('<div data-testid="suspense-fallback.is-loading">false</div>');
                expect(html).toContain('<div data-testid="suspense-fallback.is-error">false</div>');
                expect(html).toContain('<div data-testid="suspense-fallback.is-fetching">true</div>');
                expect(html).toContain('<div data-testid="suspense-fallback.error">undefined</div>');
                expect(html).toContain('<div data-testid="suspense-fallback.current-data">undefined</div>');
                expect(html).toContain('<div data-testid="suspense-fallback.render-count">1</div>');

                expect(html).toContain('<div data-testid="is-loading">false</div>');
                expect(html).toContain('<div data-testid="is-error">false</div>');
                expect(html).toContain('<div data-testid="is-fetching">false</div>');
                expect(html).toContain('<div data-testid="data">server value</div>');
                expect(html).toContain('<div data-testid="current-data">server value</div>');
                expect(html).toContain('<div data-testid="error">undefined</div>');
                expect(html).toContain('<div data-testid="render-count">2</div>');
            });
        });
    });

    describe("error boundary behavior", () => {
        describe("with accessor function", () => {
            it("should throw error", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error });

                render(<Screen flow={flow} />, {
                    // @ts-expect-error incorrect types in testing-library
                    onCaughtError(err: unknown) {
                        expect(err).toBe(error);
                    },
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
                expect(screen.getByTestId("error-fallback")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("error-fallback.render-count")).toHaveTextContent("1");
            });

            it("should handle transition from pending to error state", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "pending" });

                render(<Screen flow={flow} />, {
                    // @ts-expect-error incorrect types in testing-library
                    onCaughtError(err: unknown) {
                        expect(err).toBe(error);
                    },
                });

                expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("suspense-fallback.render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "error", error });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
                expect(screen.getByTestId("error-fallback")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("error-fallback.render-count")).toHaveTextContent("4");
            });

            it("should handle transition from error to pending state", async () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error });

                const { rerender } = render(<Screen flow={flow} />, {
                    // @ts-expect-error incorrect types in testing-library
                    onCaughtError(err: unknown) {
                        expect(err).toBe(error);
                    },
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
                expect(screen.getByTestId("error-fallback")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("error-fallback.render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "pending" });
                });

                rerender(<Screen flow={flow} errorKey="v2" />);

                expect(await screen.findByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("suspense-fallback.render-count")).toHaveTextContent("2");
            });

            it("should return updating state if state.data is defined", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error });

                const { rerender } = render(<Screen flow={flow} />, {
                    // @ts-expect-error incorrect types in testing-library
                    onCaughtError(err: unknown) {
                        expect(err).toBe(error);
                    },
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
                expect(screen.getByTestId("error-fallback")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("error-fallback.render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "pending", data: 42 });
                });

                rerender(<Screen flow={flow} errorKey="v2" />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("2");
            });

            it("should render data in error state when available", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error, data: 42 });

                render(<Screen flow={flow} />, {
                    // @ts-expect-error incorrect types in testing-library
                    onCaughtError(err: unknown) {
                        expect(err).toBe(error);
                    },
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("42");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");
            });
        });

        describe("with isError flag", () => {
            it("should return error state", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error });

                render(<Screen flow={flow} errorBoundary={false} />, {
                    // @ts-expect-error incorrect types in testing-library
                    onCaughtError(err: unknown) {
                        expect(err).toBe(error);
                    },
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");
            });

            it("should handle transition from pending to error state", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "pending" });

                render(<Screen flow={flow} errorBoundary={false} />);

                expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("suspense-fallback.render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "error", error });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("3");
            });

            it("should handle transition from error to pending state", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error });

                render(<Screen flow={flow} errorBoundary={false} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "pending" });
                });

                expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("suspense-fallback.error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("suspense-fallback.is-loading")).toHaveTextContent("true");
                expect(screen.getByTestId("suspense-fallback.is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("suspense-fallback.is-fetching")).toHaveTextContent("true");
                expect(screen.getByTestId("suspense-fallback.current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("suspense-fallback.error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("suspense-fallback.render-count")).toHaveTextContent("2");
            });

            it("should return updating state if state.data is defined", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error });

                render(<Screen flow={flow} errorBoundary={false} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "pending", data: 42 });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("2");
            });
        });
    });

    describe("skipToken behavior", () => {
        it("should return null when skipToken is passed", () => {
            render(<Screen flow={skipToken} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");
        });

        it("should return null when switching from flow to skipToken", () => {
            const flow = createAsyncFlow({ status: "success", data: 42 });

            const { rerender } = render(<Screen flow={flow} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            rerender(<Screen flow={skipToken} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("2");
            expect(getSubscriptionsCount(flow)).toBe(0);
        });

        it("should trigger suspense when switching from skipToken to pending flow", async () => {
            const flow = createAsyncFlow({ status: "pending" });

            const { rerender } = render(<Screen flow={skipToken} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            rerender(<Screen flow={flow} />);

            expect(await screen.findByTestId("suspense-fallback")).toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("suspense-fallback.is-loading")).toHaveTextContent("true");
            expect(screen.getByTestId("suspense-fallback.is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("suspense-fallback.is-fetching")).toHaveTextContent("true");
            expect(screen.getByTestId("suspense-fallback.current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("suspense-fallback.error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("suspense-fallback.render-count")).toHaveTextContent("2");

            act(() => {
                flow.emit({ status: "success", data: 42 });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("4");
        });

        it("should not trigger suspense when switching from skipToken to success flow", () => {
            const flow = createAsyncFlow({ status: "success", data: 42 });

            const { rerender } = render(<Screen flow={skipToken} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            rerender(<Screen flow={flow} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("2");
        });
    });

    describe("prevState behavior", () => {
        it("should track previous success state for updating state", () => {
            const flow = createAsyncFlow({ status: "success", data: 42 });

            render(<Screen flow={flow} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            act(() => {
                flow.emit({ status: "pending" });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("2");
        });

        it("should return loading state if no previous success state", () => {
            const flow = createAsyncFlow({ status: "pending" });

            render(<Screen flow={flow} />);

            expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("suspense-fallback.is-loading")).toHaveTextContent("true");
            expect(screen.getByTestId("suspense-fallback.is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("suspense-fallback.is-fetching")).toHaveTextContent("true");
            expect(screen.getByTestId("suspense-fallback.current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("suspense-fallback.error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("suspense-fallback.render-count")).toHaveTextContent("1");

            act(() => {
                flow.emit({ status: "success", data: 42 });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("3");

            act(() => {
                flow.emit({ status: "pending" });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("4");
        });

        it("should update prevState ref after each state change", () => {
            const flow = createAsyncFlow({ status: "success", data: 42 });

            render(<Screen flow={flow} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("42");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            act(() => {
                flow.emit({ status: "success", data: 108 });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
            expect(screen.getByTestId("data")).toHaveTextContent("108");
            expect(screen.getByTestId("current-data")).toHaveTextContent("108");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("2");

            act(() => {
                flow.emit({ status: "pending" });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
            expect(screen.getByTestId("data")).toHaveTextContent("108");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("3");
        });
    });

    describe("hydration behavior", () => {
        it("should hydrate server markup", async () => {
            // @ts-expect-error emulate serder-side env
            delete globalThis.window;

            const initialValue = { status: "pending" as const };
            const flow = createAsyncFlow<string>(initialValue);
            const serverManager = createServerHydrationManager();

            const App = ({ children, manager }: { children: ReactNode; manager: FlowHydrationManager }) => {
                return (
                    <FlowHydrationProvider manager={manager}>
                        <main>
                            <h1>App</h1>
                            <Suspense fallback={<div data-testid="fallback">Loading...</div>}>{children}</Suspense>
                        </main>
                    </FlowHydrationProvider>
                );
            };

            const TestComponent = () => {
                const [data] = useAsyncFlow(flow);
                return <div data-testid="value">{data()}</div>;
            };

            const renderPromise = renderToString(
                <App manager={serverManager}>
                    <TestComponent />
                </App>,
                serverManager,
            );

            // should wait for the first render to finish
            await Promise.resolve();

            act(() => {
                flow.emit({ status: "success", data: "server value" });
            });

            const { html } = await renderPromise;

            expect(html).toMatchInlineSnapshot(
                `
              "<script>(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["_R_2_",{"status":"pending"}]]));</script><main><h1>App</h1><!--$?--><template id="B:0"></template><div data-testid="fallback">Loading...</div><!--/$--></main><script>requestAnimationFrame(function(){$RT=performance.now()});</script><script>_FS_.m(new Map([["_R_2_",{"status":"success","data":"server value"}]]));</script><div hidden id="S:0"><div data-testid="value">server value</div></div><script>$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
              $RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};$RC("B:0","S:0")</script>"
            `,
            );

            globalThis.window = originalWindow;

            const hydrationContainer = document.createElement("div");
            hydrationContainer.innerHTML = html;
            document.body.appendChild(hydrationContainer);
            runScripts(hydrationContainer);

            flow.emit(initialValue);
            const clientManager = createClientHydrationManager();

            render(
                <App manager={clientManager}>
                    <TestComponent />
                </App>,
                {
                    container: hydrationContainer,
                    hydrate: true,
                },
            );

            expect(screen.getByTestId("value")).toHaveTextContent("server value");

            // wait for hydration
            await new Promise((r) => setTimeout(r, 100));

            act(() => {
                flow.emit({ status: "success", data: "client value" });
            });

            await waitFor(() => {
                expect(screen.getByTestId("value")).toHaveTextContent("client value");
            });
        });

        it("should throw error for pending status in hydrated data", async () => {
            const flow = createAsyncFlow<string>({ status: "pending" });
            const serverManager = createServerHydrationManager();

            const App = ({ children, manager }: { children: ReactNode; manager: FlowHydrationManager }) => {
                return (
                    <FlowHydrationProvider manager={manager}>
                        <main>
                            <h1>App</h1>
                            <Suspense fallback={<div data-testid="fallback">Loading...</div>}>{children}</Suspense>
                        </main>
                    </FlowHydrationProvider>
                );
            };

            const TestComponent = () => {
                useFlow(flow);
                return null;
            };

            const renderPromise = renderToString(
                <App manager={serverManager}>
                    <TestComponent />
                </App>,
                serverManager,
            );

            const { html } = await renderPromise;

            expect(html).toMatchInlineSnapshot(
                `"<script>(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["_R_2_",{"status":"pending"}]]));</script><main><h1>App</h1><!--$--><!--/$--></main>"`,
            );

            const hydrationContainer = document.createElement("div");
            hydrationContainer.innerHTML = html;
            document.body.appendChild(hydrationContainer);
            runScripts(hydrationContainer);

            // flow.emit({ status: "success", data: "server value" });
            const clientManager = createClientHydrationManager();

            const TestClientComponent = () => {
                const [data] = useAsyncFlow(flow);
                data();
                return null;
            };

            const errorSpy = vi.fn();
            render(
                <App manager={clientManager}>
                    <TestClientComponent />
                </App>,
                {
                    container: hydrationContainer,
                    hydrate: true,
                    onRecoverableError(err) {
                        errorSpy(err);
                        expect(err).toHaveProperty(
                            "cause.message",
                            expect.stringMatching("Unexpected pending state for async flow during component hydration"),
                        );
                    },
                },
            );

            // wait for hydration
            await new Promise((r) => setTimeout(r, 100));

            expect(errorSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe("parallel async operations", () => {
        it("should load async operations in parallel", () => {
            const flow1 = createAsyncFlow<string>({ status: "pending" });
            const flow2 = createAsyncFlow<string>({ status: "pending" });

            const spy1 = vi.spyOn(flow1, "getSnapshot");
            const spy2 = vi.spyOn(flow2, "getSnapshot");

            const App = ({ children }: { children: ReactNode }) => {
                return (
                    <main>
                        <h1>App</h1>
                        <Suspense fallback={<div data-testid="fallback">Loading...</div>}>{children}</Suspense>
                    </main>
                );
            };

            const TestComponent = () => {
                const [data1] = useAsyncFlow(flow1);
                const [data2] = useAsyncFlow(flow2);
                return (
                    <>
                        <div data-testid="value1">{data1()}</div>
                        <div data-testid="value2">{data2()}</div>
                    </>
                );
            };

            render(
                <App>
                    <TestComponent />
                </App>,
            );

            expect(screen.getByTestId("fallback")).toBeInTheDocument();
            expect(spy1).toHaveBeenCalled();
            expect(spy2).toHaveBeenCalled();
        });

        it("should fallback to waterfall if accessor called before second hook", () => {
            const flow1 = createAsyncFlow<string>({ status: "pending" });
            const flow2 = createAsyncFlow<string>({ status: "pending" });

            const spy1 = vi.spyOn(flow1, "getSnapshot");
            const spy2 = vi.spyOn(flow2, "getSnapshot");

            const App = ({ children }: { children: ReactNode }) => {
                return (
                    <main>
                        <h1>App</h1>
                        <Suspense fallback={<div data-testid="fallback">Loading...</div>}>{children}</Suspense>
                    </main>
                );
            };

            const TestComponent = () => {
                const [data1] = useAsyncFlow(flow1);
                const value1 = data1();
                const [data2] = useAsyncFlow(flow2);
                const value2 = data2();
                return (
                    <>
                        <div data-testid="value1">{value1}</div>
                        <div data-testid="value2">{value2}</div>
                    </>
                );
            };

            render(
                <App>
                    <TestComponent />
                </App>,
            );

            expect(screen.getByTestId("fallback")).toBeInTheDocument();
            expect(spy1).toHaveBeenCalled();
            expect(spy2).not.toHaveBeenCalled();
        });
    });

    describe("edge cases", () => {
        it("should not hang if the accessor passed down the component tree (client rendering)", () => {
            const flow = createAsyncFlow<string>({ status: "pending" });

            const TestComponent = (props: { data: () => string }) => {
                return <div data-testid="value">{props.data()}</div>;
            };

            const App = () => {
                const [data] = useAsyncFlow(flow);

                return (
                    <main>
                        <h1>App</h1>
                        <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
                            <TestComponent data={data} />
                        </Suspense>
                    </main>
                );
            };

            render(<App />);

            expect(screen.getByTestId("fallback")).toBeInTheDocument();

            act(() => {
                flow.emit({ status: "success", data: "foo" });
            });

            expect(screen.getByTestId("value")).toHaveTextContent("foo");
        });

        it("should not hang if the accessor passed down the component tree (server rendering)", async () => {
            // @ts-expect-error emulate serder-side env
            delete globalThis.window;

            const flow = createAsyncFlow<string>({ status: "pending" });

            const TestComponent = (props: { data: () => string }) => {
                return <div data-testid="value">{props.data()}</div>;
            };

            const App = () => {
                const [data] = useAsyncFlow(flow);

                return (
                    <main>
                        <h1>App</h1>
                        <Suspense fallback={<div data-testid="fallback">Loading...</div>}>
                            <TestComponent data={data} />
                        </Suspense>
                    </main>
                );
            };

            const serverManager = createServerHydrationManager();
            const renderPromise = renderToString(<App />, serverManager);

            // should wait for the first render to finish
            await Promise.resolve();

            act(() => {
                flow.emit({ status: "success", data: "foo" });
            });

            const { html } = await renderPromise;
            expect(html).toMatchInlineSnapshot(`
              "<main><h1>App</h1><!--$?--><template id="B:0"></template><div data-testid="fallback">Loading...</div><!--/$--></main><script>requestAnimationFrame(function(){$RT=performance.now()});</script><div hidden id="S:0"><div data-testid="value">foo</div></div><script>$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
              $RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};$RC("B:0","S:0")</script>"
            `);

            expect(html).toContain('<div data-testid="value">foo</div>');
        });
    });
});

class ErrorBoundary extends Component<
    { children: ReactNode; fallback: (error: unknown) => ReactNode },
    { hasError: boolean; error?: unknown }
> {
    constructor(props: { children: ReactNode; fallback: (error: unknown) => ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: unknown) {
        return { hasError: true, error };
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback(this.state.error);
        }
        return this.props.children;
    }
}

interface RenderCounter {
    get(): number;
    inc(): void;
}

function TestComponent<T>(props: {
    flow: AsyncFlow<T> | SkipToken;
    renderCount: RenderCounter;
    suspense?: boolean;
    errorBoundary?: boolean;
}) {
    props.renderCount.inc();
    const [data, state] = useAsyncFlow(props.flow);

    if (props.suspense === false && state.isLoading) {
        return <FlowState prefix="" state={state} renderCount={props.renderCount} />;
    }

    if (props.errorBoundary === false && state.isError) {
        return <FlowState prefix="" state={state} renderCount={props.renderCount} />;
    }

    return (
        <>
            <FlowState prefix="" state={state} renderCount={props.renderCount} />
            <div data-testid="data">{String(data?.())}</div>
        </>
    );
}

function Screen<T>(props: {
    flow: AsyncFlow<T> | SkipToken;
    errorKey?: string;
    suspense?: boolean;
    errorBoundary?: boolean;
}) {
    const [renderCount] = useState(() => {
        let count = 0;
        return {
            get: () => count,
            inc: () => count++,
        };
    });

    const [, state] = useAsyncFlow(props.flow);

    return (
        <ErrorBoundary
            key={props.errorKey}
            fallback={(error) => <ErrorFallback error={error} state={state} renderCount={renderCount} />}
        >
            <Suspense fallback={<SuspenseFallback state={state} renderCount={renderCount} />}>
                <TestComponent
                    flow={props.flow}
                    renderCount={renderCount}
                    suspense={props.suspense}
                    errorBoundary={props.errorBoundary}
                />
            </Suspense>
        </ErrorBoundary>
    );
}

function FlowState(props: { prefix: string; renderCount: RenderCounter; state: UseAsyncFlowResult<unknown>[1] }) {
    return (
        <>
            <div data-testid={`${props.prefix}is-loading`}>{String(props.state.isLoading)}</div>
            <div data-testid={`${props.prefix}is-error`}>{String(props.state.isError)}</div>
            <div data-testid={`${props.prefix}is-fetching`}>{String(props.state.isFetching)}</div>
            <div data-testid={`${props.prefix}current-data`}>{String(props.state.currentData)}</div>
            <div data-testid={`${props.prefix}error`}>{String(props.state.error)}</div>
            <div data-testid={`${props.prefix}render-count`}>{props.renderCount.get()}</div>
        </>
    );
}

function SuspenseFallback(props: { state: UseAsyncFlowResult<unknown>[1]; renderCount: RenderCounter }) {
    return (
        <>
            <div data-testid="suspense-fallback">Loading...</div>
            <FlowState prefix="suspense-fallback." state={props.state} renderCount={props.renderCount} />
        </>
    );
}

function ErrorFallback(props: { error: unknown; state: UseAsyncFlowResult<unknown>[1]; renderCount: RenderCounter }) {
    return (
        <>
            <div data-testid="error-fallback">{String(props.error)}</div>
            <FlowState prefix="error-fallback." state={props.state} renderCount={props.renderCount} />
        </>
    );
}

function getSubscriptionsCount(flow: Flow<unknown>): number {
    // @ts-expect-error in tests we use an implementation that allows reading the number of subscriptions
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const subscriptions: Set<unknown> = flow.subscriptions;
    return subscriptions.size;
}

async function renderToString(element: ReactElement, manager: FlowHydrationManager) {
    const html = await new Promise<string>((resolve, reject) => {
        let content = "";

        const htmlStream = new Writable({
            write(chunk: Buffer, encoding, callback) {
                content += getHydrationScripts(manager);
                content += chunk.toString();
                callback();
            },
        });

        let didError = false;
        const stream = renderToPipeableStream(element, {
            onShellReady() {
                stream.pipe(htmlStream);
            },
            onShellError(error) {
                // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                reject(error);
            },
            onError(err) {
                didError = true;
                console.error(err);
            },
        });

        htmlStream.on("finish", () => {
            expect(didError).toBe(false);
            resolve(content);
        });

        htmlStream.on("error", (err) => {
            reject(err);
        });
    });

    return { html };
}

function getHydrationScripts(manager: FlowHydrationManager) {
    const script = manager.getScript();
    if (!script) return "";
    return `<script>${script}</script>`;
}

function runScripts(node: HTMLElement) {
    node.querySelectorAll("script").forEach((script) => {
        (0, eval)(script.textContent);
    });
}
