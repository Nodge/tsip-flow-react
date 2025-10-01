import { describe, expectTypeOf, it, expect, afterEach } from "vitest";
import { Suspense, Component, type ReactNode, useRef, type RefObject } from "react";
import { render, screen, cleanup, act, waitForElementToBeRemoved, renderHook } from "@testing-library/react";
import type { AsyncFlow, Flow } from "@tsip/types";
import { createAsyncFlow } from "@tsip/flow";
import { skipToken, type SkipToken } from "../skipToken";
import { useAsyncFlow, type SuccessState, type UpdatingState, type UseAsyncFlowOptions } from "./useAsyncFlow";

declare const window: Global & {
    _FS: Map<string, unknown> | undefined;
};

describe("useAsyncFlow", () => {
    afterEach(() => {
        cleanup();
        delete window._FS;
    });

    describe("types behavior", () => {
        it("should infer return types", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlow(flow);
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should inter return types with empty options", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlow(flow, {});
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should inter return types with skip token", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlow(Math.random() ? flow : skipToken);
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    | null
                >();
            }
        });

        it("should inter return types with suspense:false", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlow(flow, { suspense: false });
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: true;
                          isError: false;
                          data: undefined;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should inter return types with suspense:true", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlow(flow, { suspense: true });
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should inter return types with suspense:boolean", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const useSuspense = Boolean(Math.random());
                const result = useAsyncFlow(flow, { suspense: useSuspense });
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: true;
                          isError: false;
                          data: undefined;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should inter return types with errorBoundary:false", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlow(flow, { errorBoundary: false });
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    | {
                          isLoading: false;
                          isError: true;
                          data: number | undefined;
                          error: unknown;
                          isFetching: false;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should inter return types with errorBoundary:true", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlow(flow, { errorBoundary: true });
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should inter return types with errorBoundary:boolean", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const useErrorBoundary = Boolean(Math.random());
                const result = useAsyncFlow(flow, { errorBoundary: useErrorBoundary });
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    | {
                          isLoading: false;
                          isError: true;
                          data: number | undefined;
                          error: unknown;
                          isFetching: false;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should inter return types with suspense: false and errorBoundary:false", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlow(flow, { suspense: false, errorBoundary: false });
                expectTypeOf(result).toEqualTypeOf<
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: false;
                          currentData: number;
                      }
                    | {
                          isLoading: true;
                          isError: false;
                          data: undefined;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    | {
                          isLoading: false;
                          isError: false;
                          data: number;
                          error: undefined;
                          isFetching: true;
                          currentData: undefined;
                      }
                    | {
                          isLoading: false;
                          isError: true;
                          data: number | undefined;
                          error: unknown;
                          isFetching: false;
                          currentData: undefined;
                      }
                >();
            }
        });

        it("should narrow types for isFetching flag", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const { isFetching, currentData } = useAsyncFlow(flow);

                if (isFetching) {
                    expectTypeOf(currentData).toEqualTypeOf<undefined>();
                    return "loading";
                }

                expectTypeOf(currentData).toEqualTypeOf<number>();
            }
        });

        it("should narrow types for isLoading flag", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const { isLoading, data } = useAsyncFlow(flow, { suspense: false });

                if (isLoading) {
                    expectTypeOf(data).toEqualTypeOf<undefined>();
                    return "loading";
                }

                expectTypeOf(data).toEqualTypeOf<number>();
            }
        });

        it("should narrow types for isError flag", () => {
            const flow = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const { isError, data, error } = useAsyncFlow(flow, { errorBoundary: false });

                if (isError) {
                    expectTypeOf(error).toEqualTypeOf<unknown>();
                    expectTypeOf(data).toEqualTypeOf<number | undefined>();
                    return "error";
                }

                expectTypeOf(error).toEqualTypeOf<undefined>();
                expectTypeOf(data).toEqualTypeOf<number>();
            }
        });

        it("should accept union with skipToken", () => {
            const flow: AsyncFlow<number> | SkipToken = createAsyncFlow({ status: "success", data: 0 });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const state = useAsyncFlow(flow);

                expectTypeOf(state).toEqualTypeOf<SuccessState<number> | UpdatingState<number> | null>();
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
            expect(getSubscriptionsCount(flow)).toBe(1);

            act(() => {
                unmount();
            });

            expect(getSubscriptionsCount(flow)).toBe(0);
        });

        it("should return stable reference", () => {
            const flow = createAsyncFlow({ status: "success", data: 42 });

            const { result, rerender } = renderHook(() => useAsyncFlow(flow));

            const firstResult = result.current;
            expect(firstResult.isLoading).toBe(false);
            expect(firstResult.isError).toBe(false);
            expect(firstResult.isFetching).toBe(false);
            expect(firstResult.data).toBe(42);
            expect(firstResult.currentData).toBe(42);
            expect(firstResult.error).toBeUndefined();

            // Force re-render without changing flow or state
            rerender();

            const secondResult = result.current;
            expect(secondResult).toBe(firstResult);
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
            expect(getSubscriptionsCount(flow1)).toBe(1);
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
            expect(getSubscriptionsCount(flow2)).toBe(1);
        });
    });

    describe("suspense behavior", () => {
        describe("enabled", () => {
            it("should throw promise for initial pending state", async () => {
                const flow = createAsyncFlow({ status: "pending" });

                render(<Screen flow={flow} />);

                expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "success", data: 42 });
                });

                await waitForElementToBeRemoved(() => screen.queryByTestId("suspense-fallback"));
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
                expect(screen.getByTestId("is-loading")).toHaveTextContent("undefined");
                expect(screen.getByTestId("is-error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("undefined");
                expect(screen.getByTestId("data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");

                rerender(<Screen flow={flow} />);

                expect(await screen.findByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("2");

                act(() => {
                    flow.emit({ status: "success", data: 108 });
                });

                await waitForElementToBeRemoved(() => screen.queryByTestId("suspense-fallback"));
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

        describe("disabled", () => {
            it("should return loading state for initial pending", () => {
                const flow = createAsyncFlow({ status: "pending" });

                render(<Screen flow={flow} options={{ suspense: false }} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
                expect(screen.getByTestId("data")).toHaveTextContent("undefined");
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

            it("should not throw for initial pending state if state.data is defined", () => {
                const flow = createAsyncFlow({ status: "pending", data: 42 });

                render(<Screen flow={flow} options={{ suspense: false }} />);

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
        });
    });

    describe("error boundary behavior", () => {
        describe("enabled", () => {
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
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("1");
            });

            it("should handle transition from pending to error state", async () => {
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
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "error", error });
                });

                await waitForElementToBeRemoved(() => screen.queryByTestId("suspense-fallback"));
                expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
                expect(screen.getByTestId("error-fallback")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("4");
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
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "pending" });
                });

                rerender(<Screen flow={flow} errorKey="v2" />);

                expect(await screen.findByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("2");
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
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("1");

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
        });

        describe("disabled", () => {
            it("should return error state", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error });

                render(<Screen flow={flow} options={{ errorBoundary: false }} />, {
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
                expect(screen.getByTestId("data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");
            });

            it("should return error state with stale data", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error, data: 42 });

                render(<Screen flow={flow} options={{ errorBoundary: false }} />, {
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
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");
            });

            it("should preserve previous data in error state when available", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "success", data: 42 });

                render(<Screen flow={flow} options={{ errorBoundary: false }} />, {
                    // @ts-expect-error incorrect types in testing-library
                    onCaughtError(err: unknown) {
                        expect(err).toBe(error);
                    },
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

                act(() => {
                    flow.emit({ status: "error", error });
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("42");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("2");
            });

            it("should handle transition from pending to error state", async () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "pending" });

                render(<Screen flow={flow} options={{ errorBoundary: false }} />);

                expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "error", error });
                });

                await waitForElementToBeRemoved(() => screen.queryByTestId("suspense-fallback"));
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("3");
            });

            it("should handle transition from error to pending state", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error });

                render(<Screen flow={flow} options={{ errorBoundary: false }} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");

                act(() => {
                    flow.emit({ status: "pending" });
                });

                expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("2");
            });

            it("should return updating state if state.data is defined", () => {
                const error = new Error("Test Error");
                const flow = createAsyncFlow({ status: "error", error });

                render(<Screen flow={flow} options={{ errorBoundary: false }} />);

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false");
                expect(screen.getByTestId("data")).toHaveTextContent("undefined");
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
            expect(screen.getByTestId("is-loading")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("undefined");
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
            expect(screen.getByTestId("is-loading")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("undefined");
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
            expect(screen.getByTestId("is-loading")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("undefined");
            expect(screen.getByTestId("data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            rerender(<Screen flow={flow} />);

            expect(await screen.findByTestId("suspense-fallback")).toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("2");

            act(() => {
                flow.emit({ status: "success", data: 42 });
            });

            await waitForElementToBeRemoved(() => screen.queryByTestId("suspense-fallback"));
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
            expect(screen.getByTestId("is-loading")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("undefined");
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

        it("should handle skipToken with suspense=false", () => {
            const flow = createAsyncFlow({ status: "pending" });
            const { rerender } = render(<Screen flow={skipToken} options={{ suspense: false }} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("undefined");
            expect(screen.getByTestId("data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            rerender(<Screen flow={flow} options={{ suspense: false }} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
            expect(screen.getByTestId("data")).toHaveTextContent("undefined");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined");
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

            render(<Screen flow={flow} options={{ suspense: false }} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("true");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true");
            expect(screen.getByTestId("data")).toHaveTextContent("undefined");
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
            expect(screen.getByTestId("render-count")).toHaveTextContent("3");
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

function TestComponent<T>(props: {
    flow: AsyncFlow<T> | SkipToken;
    options?: UseAsyncFlowOptions;
    renderCount: RefObject<number>;
}) {
    props.renderCount.current++;

    const result = useAsyncFlow(props.flow, props.options);

    return (
        <>
            <div data-testid="is-loading">{String(result?.isLoading)}</div>
            <div data-testid="is-error">{String(result?.isError)}</div>
            <div data-testid="is-fetching">{String(result?.isFetching)}</div>
            <div data-testid="data">{String(result?.data)}</div>
            <div data-testid="current-data">{String(result?.currentData)}</div>
            <div data-testid="error">{String(result?.error)}</div>
            <div data-testid="render-count">{props.renderCount.current}</div>
        </>
    );
}

function Screen<T>(props: { flow: AsyncFlow<T> | SkipToken; options?: UseAsyncFlowOptions; errorKey?: string }) {
    const renderCount = useRef(0);

    return (
        <ErrorBoundary
            key={props.errorKey}
            fallback={(error) => <ErrorFallback error={error} renderCount={renderCount} />}
        >
            <Suspense fallback={<SuspenseFallback renderCount={renderCount} />}>
                <TestComponent flow={props.flow} options={props.options} renderCount={renderCount} />
            </Suspense>
        </ErrorBoundary>
    );
}

function SuspenseFallback(props: { renderCount: RefObject<number> }) {
    return (
        <>
            <div data-testid="suspense-fallback">Loading...</div>
            <div data-testid="render-count-fallback">{props.renderCount.current}</div>
        </>
    );
}

function ErrorFallback(props: { error: unknown; renderCount: RefObject<number> }) {
    return (
        <>
            <div data-testid="error-fallback">{String(props.error)}</div>
            <div data-testid="render-count-fallback">{props.renderCount.current}</div>
        </>
    );
}

function getSubscriptionsCount(flow: Flow<unknown>): number {
    // @ts-expect-error in tests we use an implementation that allows reading the number of subscriptions
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const subscriptions: Set<unknown> = flow.subscriptions;
    return subscriptions.size;
}
