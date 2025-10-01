import { describe, expectTypeOf, it, expect, afterEach, vi } from "vitest";
import { Suspense, Component, type ReactNode, useRef, type RefObject } from "react";
import { render, screen, cleanup, act, waitForElementToBeRemoved } from "@testing-library/react";
import type { AsyncFlow } from "@tsip/types";
import { createAsyncFlow } from "@tsip/flow";
import { skipToken, type SkipToken } from "../skipToken";
import { useAsyncFlows, type UseAsyncFlowsOptions } from "./useAsyncFlows";
import type { ErrorState, SuccessState, UpdatingState } from "./useAsyncFlow";

describe("useAsyncFlow", () => {
    afterEach(() => {
        cleanup();
    });

    describe("types behavior", () => {
        it("should infer return types", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 0 });
            const flow2 = createAsyncFlow({ status: "success", data: "" });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlows([flow1, flow2]);
                expectTypeOf(result).toEqualTypeOf<
                    [
                        // flow1
                        SuccessState<number> | UpdatingState<number>,
                        // flow2
                        SuccessState<string> | UpdatingState<string>,
                    ]
                >();
            }
        });

        it("should infer return types with empty options", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 0 });
            const flow2 = createAsyncFlow({ status: "success", data: "" });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlows([flow1, flow2]);
                expectTypeOf(result).toEqualTypeOf<
                    [
                        // flow1
                        SuccessState<number> | UpdatingState<number>,
                        // flow2
                        SuccessState<string> | UpdatingState<string>,
                    ]
                >();
            }
        });

        it("should infer return types with empty flows", () => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlows([]);
                expectTypeOf(result).toEqualTypeOf<[]>();
            }
        });

        it("should infer return types with skip token", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 0 });
            const flow2 = createAsyncFlow({ status: "success", data: "" });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlows([flow1, Math.random() ? skipToken : flow2]);
                expectTypeOf(result).toEqualTypeOf<
                    [
                        // flow1
                        SuccessState<number> | UpdatingState<number>,
                        // flow2
                        SuccessState<string> | UpdatingState<string> | null,
                    ]
                >();
            }
        });

        it("should infer return types with errorBoundary:false", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 0 });
            const flow2 = createAsyncFlow({ status: "success", data: "" });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlows([flow1, flow2], { errorBoundary: false });
                expectTypeOf(result).toEqualTypeOf<
                    [
                        // flow1
                        SuccessState<number> | UpdatingState<number> | ErrorState<number>,
                        // flow2
                        SuccessState<string> | UpdatingState<string> | ErrorState<string>,
                    ]
                >();
            }
        });

        it("should infer return types with errorBoundary:true", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 0 });
            const flow2 = createAsyncFlow({ status: "success", data: "" });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const result = useAsyncFlows([flow1, flow2], { errorBoundary: true });
                expectTypeOf(result).toEqualTypeOf<
                    [
                        // flow1
                        SuccessState<number> | UpdatingState<number>,
                        // flow2
                        SuccessState<string> | UpdatingState<string>,
                    ]
                >();
            }
        });

        it("should infer return types with errorBoundary:boolean", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 0 });
            const flow2 = createAsyncFlow({ status: "success", data: "" });

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            function Component() {
                const useErrorBoundary = Boolean(Math.random());
                const result = useAsyncFlows([flow1, flow2], { errorBoundary: useErrorBoundary });
                expectTypeOf(result).toEqualTypeOf<
                    [
                        // flow1
                        SuccessState<number> | UpdatingState<number> | ErrorState<number>,
                        // flow2
                        SuccessState<string> | UpdatingState<string> | ErrorState<string>,
                    ]
                >();
            }
        });
    });

    describe("suspense behavior", () => {
        it("should throw promise for initial pending state", async () => {
            const flow1 = createAsyncFlow({ status: "pending" });
            const flow2 = createAsyncFlow({ status: "pending" });

            const spy1 = vi.spyOn(flow1, "getSnapshot");
            const spy2 = vi.spyOn(flow2, "getSnapshot");

            render(<Screen flows={[flow1, flow2]} />);

            expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("1");
            expect(spy1).toHaveBeenCalledTimes(3);
            expect(spy2).toHaveBeenCalledTimes(3);

            act(() => {
                flow1.emit({ status: "success", data: 42 });
            });

            expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("1");
            expect(spy1).toHaveBeenCalledTimes(4);
            expect(spy2).toHaveBeenCalledTimes(3);

            act(() => {
                flow2.emit({ status: "success", data: "foo" });
            });

            await waitForElementToBeRemoved(() => screen.queryByTestId("suspense-fallback"));
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,false");
            expect(screen.getByTestId("data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("3");
            expect(spy1).toHaveBeenCalledTimes(9);
            expect(spy2).toHaveBeenCalledTimes(9);
        });

        it("should not throw for initial pending state if state.data is defined", () => {
            const flow1 = createAsyncFlow({ status: "pending", data: 42 });
            const flow2 = createAsyncFlow({ status: "pending", data: "foo" });

            render(<Screen flows={[flow1, flow2]} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true,true");
            expect(screen.getByTestId("data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            act(() => {
                flow1.emit({ status: "success", data: 108 });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,true");
            expect(screen.getByTestId("data")).toHaveTextContent("108,foo");
            expect(screen.getByTestId("current-data")).toHaveTextContent("108,undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("2");

            act(() => {
                flow2.emit({ status: "success", data: "bar" });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,false");
            expect(screen.getByTestId("data")).toHaveTextContent("108,bar");
            expect(screen.getByTestId("current-data")).toHaveTextContent("108,bar");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("3");
        });

        it("should not throw for initial success state", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 42 });
            const flow2 = createAsyncFlow({ status: "success", data: "foo" });

            render(<Screen flows={[flow1, flow2]} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,false");
            expect(screen.getByTestId("data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");
        });

        it("should not throw for subsequent pending state", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 42 });
            const flow2 = createAsyncFlow({ status: "success", data: "foo" });

            render(<Screen flows={[flow1, flow2]} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,false");
            expect(screen.getByTestId("data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            act(() => {
                flow1.emit({ status: "pending" });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true,false");
            expect(screen.getByTestId("data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined,foo");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("2");

            act(() => {
                flow2.emit({ status: "pending" });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true,true");
            expect(screen.getByTestId("data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("3");

            act(() => {
                flow2.emit({ status: "success", data: "bar" });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("true,false");
            expect(screen.getByTestId("data")).toHaveTextContent("42,bar");
            expect(screen.getByTestId("current-data")).toHaveTextContent("undefined,bar");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("4");

            act(() => {
                flow1.emit({ status: "success", data: 108 });
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,false");
            expect(screen.getByTestId("data")).toHaveTextContent("108,bar");
            expect(screen.getByTestId("current-data")).toHaveTextContent("108,bar");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("5");
        });

        it("should throw promise when switching from skipToken to pending flow", async () => {
            const flow1 = createAsyncFlow({ status: "success", data: 42 });
            const flow2 = createAsyncFlow({ status: "pending" });

            const { rerender } = render(<Screen flows={[flow1, skipToken]} />);

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,skipped");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,skipped");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,skipped");
            expect(screen.getByTestId("data")).toHaveTextContent("42,skipped");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42,skipped");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,skipped");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            rerender(<Screen flows={[flow1, flow2]} />);

            expect(await screen.findByTestId("suspense-fallback")).toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("2");

            act(() => {
                flow2.emit({ status: "success", data: "foo" });
            });

            await waitForElementToBeRemoved(() => screen.queryByTestId("suspense-fallback"));
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,false");
            expect(screen.getByTestId("data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("4");
        });
    });

    describe("rules of hooks", () => {
        it("should throw error on flows count change", () => {
            const flow1 = createAsyncFlow({ status: "success", data: 42 });
            const flow2 = createAsyncFlow({ status: "success", data: "foo" });

            const { rerender } = render(<Screen flows={[flow1]} />, {
                // @ts-expect-error incorrect types in testing-library
                onCaughtError() {
                    // noop
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

            rerender(<Screen flows={[flow1, flow2]} />);

            expect(screen.getByTestId("error-fallback")).toHaveTextContent(
                "The number of flows changed between renders",
            );
        });

        it("should throw error on flows count change during suspended state", () => {
            const flow1 = createAsyncFlow({ status: "pending" });
            const flow2 = createAsyncFlow({ status: "success", data: "foo" });

            const { rerender } = render(<Screen flows={[skipToken]} />, {
                // @ts-expect-error incorrect types in testing-library
                onCaughtError() {
                    // noop
                },
            });

            expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("data")).toHaveTextContent("skipped");
            expect(screen.getByTestId("render-count")).toHaveTextContent("1");

            rerender(<Screen flows={[flow1]} />);

            expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("2");

            rerender(<Screen flows={[flow1, flow2]} />);

            expect(screen.getByTestId("error-fallback")).toHaveTextContent(
                "The number of flows changed between renders",
            );
        });

        it("should not throw error on flows count change during initial suspended state", async () => {
            const flow1 = createAsyncFlow({ status: "pending" });
            const flow2 = createAsyncFlow({ status: "success", data: "foo" });

            const { rerender } = render(<Screen flows={[flow1]} />);

            expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("1");

            rerender(<Screen flows={[flow1, flow2]} />);

            expect(screen.getByTestId("suspense-fallback")).toBeInTheDocument();
            expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
            expect(screen.getByTestId("render-count-fallback")).toHaveTextContent("3");

            act(() => {
                flow1.emit({ status: "success", data: 42 });
            });

            await waitForElementToBeRemoved(() => screen.getByTestId("suspense-fallback"));
            expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-error")).toHaveTextContent("false,false");
            expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,false");
            expect(screen.getByTestId("data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("current-data")).toHaveTextContent("42,foo");
            expect(screen.getByTestId("error")).toHaveTextContent("undefined,undefined");
            expect(screen.getByTestId("render-count")).toHaveTextContent("5");
        });
    });

    describe("error boundary behavior", () => {
        describe("enabled", () => {
            it("should throw error", () => {
                const error = new Error("Test Error");
                const flow1 = createAsyncFlow({ status: "success", data: 42 });
                const flow2 = createAsyncFlow({ status: "error", error });

                render(<Screen flows={[flow1, flow2]} />, {
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
        });

        describe("disabled", () => {
            it("should return error state", () => {
                const error = new Error("Test Error");
                const flow1 = createAsyncFlow({ status: "success", data: 42 });
                const flow2 = createAsyncFlow({ status: "error", error });

                render(<Screen flows={[flow1, flow2]} options={{ errorBoundary: false }} />, {
                    // @ts-expect-error incorrect types in testing-library
                    onCaughtError(err: unknown) {
                        expect(err).toBe(error);
                    },
                });

                expect(screen.queryByTestId("suspense-fallback")).not.toBeInTheDocument();
                expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
                expect(screen.getByTestId("is-loading")).toHaveTextContent("false,false");
                expect(screen.getByTestId("is-error")).toHaveTextContent("false,true");
                expect(screen.getByTestId("is-fetching")).toHaveTextContent("false,false");
                expect(screen.getByTestId("data")).toHaveTextContent("42,undefined");
                expect(screen.getByTestId("current-data")).toHaveTextContent("42,undefined");
                expect(screen.getByTestId("error")).toHaveTextContent("undefined,Error: Test Error");
                expect(screen.getByTestId("render-count")).toHaveTextContent("1");
            });
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

function TestComponent(props: {
    flows: (AsyncFlow<unknown> | SkipToken)[];
    options?: UseAsyncFlowsOptions;
    renderCount: RefObject<number>;
}) {
    props.renderCount.current++;

    const result = useAsyncFlows(props.flows, props.options);
    const map = (
        items: typeof result,
        mapper: (
            item: SuccessState<unknown> | UpdatingState<unknown> | ErrorState<unknown> | null,
        ) => string | boolean | undefined,
    ) => {
        return items.map((item) => (item === null ? "skipped" : mapper(item)?.toString())).join(",");
    };

    return (
        <>
            <div data-testid="is-loading">{map(result, (item) => item?.isLoading)}</div>
            <div data-testid="is-error">{map(result, (item) => item?.isError)}</div>
            <div data-testid="is-fetching">{map(result, (item) => item?.isFetching)}</div>
            <div data-testid="data">{map(result, (item) => String(item?.data))}</div>
            <div data-testid="current-data">{map(result, (item) => String(item?.currentData))}</div>
            <div data-testid="error">{map(result, (item) => String(item?.error))}</div>
            <div data-testid="render-count">{props.renderCount.current}</div>
        </>
    );
}

function Screen(props: {
    flows: (AsyncFlow<unknown> | SkipToken)[];
    options?: UseAsyncFlowsOptions;
    errorKey?: string;
}) {
    const renderCount = useRef(0);

    return (
        <ErrorBoundary
            key={props.errorKey}
            fallback={(error) => <ErrorFallback error={error} renderCount={renderCount} />}
        >
            <Suspense fallback={<SuspenseFallback renderCount={renderCount} />}>
                <TestComponent flows={props.flows} options={props.options} renderCount={renderCount} />
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
