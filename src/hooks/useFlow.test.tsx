import { Writable } from "stream";
import { describe, expectTypeOf, it, expect, afterEach, vi } from "vitest";
import { Suspense, type ReactElement, type ReactNode } from "react";
import { renderToPipeableStream } from "react-dom/server";
import { cleanup, act, renderHook, render, screen, waitFor } from "@testing-library/react";
import type { Flow } from "@tsip/types";
import { createFlow } from "@tsip/flow";
import { skipToken, type SkipToken } from "../skipToken";
import { FlowHydrationProvider } from "../hydration/context";
import { createFlowHydrationManager as createServerHydrationManager } from "../hydration/server";
import { createFlowHydrationManager as createClientHydrationManager } from "../hydration/client";
import type { FlowHydrationManager } from "../hydration/types";
import { useFlow } from "./useFlow";

declare const window: Global & {
    _FS_: Map<string, unknown> | undefined;
};

describe("useFlow", () => {
    afterEach(() => {
        delete window._FS_;
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

    describe("hydration behavior", () => {
        it("should hydrate without errors with different values on server and client", () => {
            const flow = createFlow("client value");
            const manager = createClientHydrationManager();
            window._FS_ = new Map([["_R_0_", "server value"]]);

            const html = '<div data-testid="value">server value</div>';
            const container = document.createElement("div");
            container.innerHTML = html;
            document.body.appendChild(container);

            const TestComponent = () => {
                const value = useFlow(flow);
                return <div data-testid="value">{value}</div>;
            };

            render(<TestComponent />, {
                container,
                wrapper({ children }) {
                    return <FlowHydrationProvider manager={manager}>{children}</FlowHydrationProvider>;
                },
                hydrate: true,
            });

            expect(screen.getByTestId("value")).toHaveTextContent("client value");
        });

        it("should hydrate server markup without suspense", async () => {
            const flow = createFlow("server value");
            const serverManager = createServerHydrationManager();

            const TestComponent = () => {
                const value = useFlow(flow);
                return <div data-testid="value">{value}</div>;
            };

            const { html } = await renderToString(
                <FlowHydrationProvider manager={serverManager}>
                    <TestComponent />
                </FlowHydrationProvider>,
                serverManager,
            );

            expect(html).toMatchInlineSnapshot(
                `"<script>(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["_R_0_","server value"]]));</script><div data-testid="value">server value</div>"`,
            );

            const hydrationContainer = document.createElement("div");
            hydrationContainer.innerHTML = html;
            document.body.appendChild(hydrationContainer);
            runScripts(hydrationContainer);

            flow.emit("client value");
            const clientManager = createClientHydrationManager();

            render(
                <FlowHydrationProvider manager={clientManager}>
                    <TestComponent />
                </FlowHydrationProvider>,
                {
                    container: hydrationContainer,
                    hydrate: true,
                },
            );

            expect(screen.getByTestId("value")).toHaveTextContent("client value");
        });

        it("should hydrate server markup with suspense", async () => {
            let resolved = false;
            const { promise, resolve } = Promise.withResolvers<undefined>();

            const flow = createFlow("server value");
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
                if (!resolved) {
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw promise;
                }
                const value = useFlow(flow);
                return <div data-testid="value">{value}</div>;
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
                resolved = true;
                resolve(undefined);
            });

            const { html } = await renderPromise;

            expect(html).toMatchInlineSnapshot(
                `
              "<main><h1>App</h1><!--$?--><template id="B:0"></template><div data-testid="fallback">Loading...</div><!--/$--></main><script>requestAnimationFrame(function(){$RT=performance.now()});</script><script>(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["_R_2_","server value"]]));</script><div hidden id="S:0"><div data-testid="value">server value</div></div><script>$RB=[];$RV=function(a){$RT=performance.now();for(var b=0;b<a.length;b+=2){var c=a[b],e=a[b+1];null!==e.parentNode&&e.parentNode.removeChild(e);var f=c.parentNode;if(f){var g=c.previousSibling,h=0;do{if(c&&8===c.nodeType){var d=c.data;if("/$"===d||"/&"===d)if(0===h)break;else h--;else"$"!==d&&"$?"!==d&&"$~"!==d&&"$!"!==d&&"&"!==d||h++}d=c.nextSibling;f.removeChild(c);c=d}while(c);for(;e.firstChild;)f.insertBefore(e.firstChild,c);g.data="$";g._reactRetry&&requestAnimationFrame(g._reactRetry)}}a.length=0};
              $RC=function(a,b){if(b=document.getElementById(b))(a=document.getElementById(a))?(a.previousSibling.data="$~",$RB.push(a,b),2===$RB.length&&("number"!==typeof $RT?requestAnimationFrame($RV.bind(null,$RB)):(a=performance.now(),setTimeout($RV.bind(null,$RB),2300>a&&2E3<a?2300-a:$RT+300-a)))):b.parentNode.removeChild(b)};$RC("B:0","S:0")</script>"
            `,
            );

            const hydrationContainer = document.createElement("div");
            hydrationContainer.innerHTML = html;
            document.body.appendChild(hydrationContainer);
            runScripts(hydrationContainer);

            flow.emit("client value");
            const clientManager = createClientHydrationManager();

            let clientResolved = false;
            const { promise: clientPromise, resolve: resolveClient } = Promise.withResolvers<undefined>();
            const ClientTestComponent = () => {
                const value = useFlow(flow);
                if (!clientResolved) {
                    // eslint-disable-next-line @typescript-eslint/only-throw-error
                    throw clientPromise;
                }
                return <div data-testid="value">{value}</div>;
            };

            render(
                <App manager={clientManager}>
                    <ClientTestComponent />
                </App>,
                {
                    container: hydrationContainer,
                    hydrate: true,
                },
            );

            expect(screen.getByTestId("value")).toHaveTextContent("server value");

            act(() => {
                clientResolved = true;
                resolveClient(undefined);
            });

            await waitFor(() => {
                expect(screen.getByTestId("value")).toHaveTextContent("client value");
            });
        });

        it("should work without hydration provider", async () => {
            const flow = createFlow("server value");
            const serverManager = createServerHydrationManager();

            const TestComponent = () => {
                const value = useFlow(flow);
                return <div data-testid="value">{value}</div>;
            };

            const { html } = await renderToString(<TestComponent />, serverManager);
            expect(html).toMatchInlineSnapshot(`"<div data-testid="value">server value</div>"`);

            const hydrationContainer = document.createElement("div");
            hydrationContainer.innerHTML = html;
            document.body.appendChild(hydrationContainer);
            runScripts(hydrationContainer);

            flow.emit("client value");

            const ClientTestComponent = () => {
                const value = useFlow(flow);
                return <div data-testid="value">{value}</div>;
            };

            const errorSpy = vi.fn();
            render(<ClientTestComponent />, {
                container: hydrationContainer,
                hydrate: true,
                onRecoverableError(err) {
                    errorSpy(err);
                    expect(err).toHaveProperty("message", expect.stringMatching("Hydration failed"));
                },
            });

            expect(errorSpy).toHaveBeenCalledTimes(1);
            expect(screen.getByTestId("value")).toHaveTextContent("client value");
        });
    });
});

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
