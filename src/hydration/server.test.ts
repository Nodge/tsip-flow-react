import { describe, it, expect } from "vitest";
import { createFlowHydrationManager } from "./server";
import { createFlow } from "@tsip/flow";

describe("createFlowHydrationManager: server", () => {
    const flow = createFlow<unknown>("");

    describe("hydrate", () => {
        it("should always return undefined", () => {
            const manager = createFlowHydrationManager();
            expect(manager.hydrate("test-id")).toBeUndefined();

            manager.register("test-id", flow, "test-value");
            expect(manager.hydrate("test-id")).toBeUndefined();
        });
    });

    describe("register", () => {
        it("should register a snapshot", () => {
            const manager = createFlowHydrationManager();
            manager.register("id-1", flow, "value-1");
            manager.register("id-2", flow, "value-2");
            manager.register("id-3", flow, "value-3");

            const script = manager.getScript();
            expect(script).toContain("id-1");
            expect(script).toContain("id-2");
            expect(script).toContain("id-3");
        });

        it("should handle undefined values", () => {
            const manager = createFlowHydrationManager();
            manager.register("undefined-id", flow, undefined);

            const script = manager.getScript();
            expect(script).not.toBeNull();
            expect(script).toContain("undefined-id");
        });

        it("should overwrite existing snapshots with the same id", () => {
            const manager = createFlowHydrationManager();
            manager.register("test-id", flow, "first-value");
            manager.register("test-id", flow, "second-value");

            const script = manager.getScript();
            expect(script).not.toBeNull();
            expect(script).toContain("second-value");
        });
    });

    describe("getScript", () => {
        it("should return null when no snapshots are registered", () => {
            const manager = createFlowHydrationManager();
            const script = manager.getScript();

            expect(script).toBeNull();
        });

        it("should return a script with core initialization on first call", () => {
            const manager = createFlowHydrationManager();
            manager.register("test-id", flow, "test-value");

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["test-id","test-value"]]));"`,
            );
        });

        it("should not include core initialization on subsequent calls", () => {
            const manager = createFlowHydrationManager();

            // First call
            manager.register("id-1", flow, "value-1");
            const script1 = manager.getScript();
            expect(script1).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["id-1","value-1"]]));"`,
            );

            // Second call
            manager.register("id-2", flow, "value-2");
            const script2 = manager.getScript();
            expect(script2).toMatchInlineSnapshot(`"_FS_.m(new Map([["id-2","value-2"]]));"`);
        });

        it("should clear state after returning script", () => {
            const manager = createFlowHydrationManager();
            manager.register("test-id", flow, "test-value");

            const script1 = manager.getScript();
            expect(script1).toContain("test-id");

            const script2 = manager.getScript();
            expect(script2).toBeNull();
        });

        it("should handle multiple snapshots in a single script", () => {
            const manager = createFlowHydrationManager();
            manager.register("id-1", flow, "value-1");
            manager.register("id-2", flow, "value-2");
            manager.register("id-3", flow, "value-3");

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["id-1","value-1"],["id-2","value-2"],["id-3","value-3"]]));"`,
            );
        });

        it("should properly serialize complex data structures", () => {
            const manager = createFlowHydrationManager();
            const data = {
                string: "test",
                number: 42,
                boolean: true,
                null: null,
                undefined: undefined,
                array: [1, 2, 3],
                nested: { key: "value" },
            };
            manager.register("complex", flow, data);

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["complex",{"string":"test","number":42,"boolean":true,"null":null,"undefined":undefined,"array":[1,2,3],"nested":{"key":"value"}}]]));"`,
            );
        });

        it("should handle special characters in values", () => {
            const manager = createFlowHydrationManager();
            manager.register("special", flow, "test'with\"quotes");

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["special","test'with\\"quotes"]]));"`,
            );
        });

        it("should maintain state isolation between manager instances", () => {
            const manager1 = createFlowHydrationManager();
            const manager2 = createFlowHydrationManager();

            manager1.register("id-1", flow, "value-1");
            manager2.register("id-2", flow, "value-2");

            const script1 = manager1.getScript();
            const script2 = manager2.getScript();

            expect(script1).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["id-1","value-1"]]));"`,
            );
            expect(script2).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["id-2","value-2"]]));"`,
            );
        });

        it("should handle empty string values", () => {
            const manager = createFlowHydrationManager();
            manager.register("empty", flow, "");

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["empty",""]]));"`,
            );
        });

        it("should handle Date objects", () => {
            const manager = createFlowHydrationManager();
            const date = new Date(1000 * 1000);
            manager.register("date", flow, date);

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["date",new Date("1970-01-01T00:16:40.000Z")]]));"`,
            );
        });

        it("should handle RegExp objects", () => {
            const manager = createFlowHydrationManager();
            const regex = /test/gi;
            manager.register("regex", flow, regex);

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["regex",new RegExp("test", "gi")]]));"`,
            );
        });

        it("should handle functions", () => {
            const manager = createFlowHydrationManager();
            manager.register("fn", flow, () => {
                console.log("test");
            });

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `
              "(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["fn",() => {
                      console.log("test");
                    }]]));"
            `,
            );
        });

        it("should return valid JavaScript code", () => {
            const manager = createFlowHydrationManager();
            manager.register("test", flow, { foo: "bar" });

            const script = manager.getScript();
            expect(script).not.toBeNull();
            expect(() => {
                eval(script ?? "");
            }).not.toThrow();
        });

        it("should prevent xss", () => {
            const manager = createFlowHydrationManager();

            // Test various XSS attack vectors
            const xssPayloads: unknown[] = [
                '<script>alert("XSS 1")</script>',
                '&lt;script&gt;alert("XSS 2")&lt;/script&gt;',
                '\u003cscript\u003ealert("XSS 3")\u003c/script\u003e',
                'alert("XSS 4")',
                "alert('XSS 5')",
                '`${alert("XSS 6")}`',
                { toJSON: () => '<script>alert("XSS 7")</script>' },
            ];

            xssPayloads.forEach((payload, index) => {
                manager.register(`xss-test-${String(index)}`, flow, payload);
            });

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["xss-test-0","\\u003Cscript\\u003Ealert(\\"XSS 1\\")\\u003C\\u002Fscript\\u003E"],["xss-test-1","&lt;script&gt;alert(\\"XSS 2\\")&lt;\\u002Fscript&gt;"],["xss-test-2","\\u003Cscript\\u003Ealert(\\"XSS 3\\")\\u003C\\u002Fscript\\u003E"],["xss-test-3","alert(\\"XSS 4\\")"],["xss-test-4","alert('XSS 5')"],["xss-test-5","\`\${alert(\\"XSS 6\\")}\`"],["xss-test-6","\\u003Cscript\\u003Ealert(\\"XSS 7\\")\\u003C\\u002Fscript\\u003E"]]));"`,
            );
        });

        it("should dedupe same hook with same value in same chunk", () => {
            const manager = createFlowHydrationManager();
            const largeData = { foo: "bar" };
            manager.register("v1", flow, largeData);
            manager.register("v1", flow, largeData);

            const script1 = manager.getScript();
            expect(script1).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v1",{"foo":"bar"}]]));"`,
            );

            const script2 = manager.getScript();
            expect(script2).toBeNull();

            manager.register("v1", flow, structuredClone(largeData));
            const script3 = manager.getScript();
            expect(script3).toMatchInlineSnapshot(`"_FS_.m(new Map([["v1",{"foo":"bar"}]]));"`);
        });

        it("should dedupe same hook with same value in different chunks", () => {
            const manager = createFlowHydrationManager();
            const largeData = { foo: "bar" };
            manager.register("v1", flow, largeData);

            const script1 = manager.getScript();
            expect(script1).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v1",{"foo":"bar"}]]));"`,
            );

            manager.register("v1", flow, largeData);
            const script2 = manager.getScript();
            expect(script2).toBeNull();
        });

        it("should dedupe multiple hooks with same value in same chunk", () => {
            const manager = createFlowHydrationManager();
            const largeData = { foo: "bar" };
            manager.register("v1", flow, largeData);
            manager.register("v2", flow, largeData);

            const script = manager.getScript();
            expect(script).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v1",{"foo":"bar"}]]));_FS_.d([["v1","v2"]]);"`,
            );

            const script2 = manager.getScript();
            expect(script2).toBeNull();

            manager.register("v1", flow, structuredClone(largeData));
            const script3 = manager.getScript();
            expect(script3).toMatchInlineSnapshot(`"_FS_.m(new Map([["v1",{"foo":"bar"}]]));"`);
        });

        it("should dedupe multiple hooks with same value in different chunks", () => {
            const manager = createFlowHydrationManager();
            const largeData = { foo: "bar" };
            manager.register("v1", flow, largeData);

            const script1 = manager.getScript();
            expect(script1).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v1",{"foo":"bar"}]]));"`,
            );

            manager.register("v2", flow, largeData);
            const script2 = manager.getScript();
            expect(script2).toMatchInlineSnapshot(`"_FS_.d([["v1","v2"]]);"`);

            manager.register("v1", flow, structuredClone(largeData));
            const script3 = manager.getScript();
            expect(script3).toMatchInlineSnapshot(`"_FS_.m(new Map([["v1",{"foo":"bar"}]]));"`);
        });

        it("should not reuse hook id if its data has been changed", () => {
            const manager = createFlowHydrationManager();
            const largeData = { foo: "bar" };
            manager.register("v1", flow, largeData);

            const script1 = manager.getScript();
            expect(script1).toMatchInlineSnapshot(
                `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v1",{"foo":"bar"}]]));"`,
            );

            manager.register("v1", flow, 42);
            const script2 = manager.getScript();
            expect(script2).toMatchInlineSnapshot(`"_FS_.m(new Map([["v1",42]]));"`);

            manager.register("v2", flow, largeData);
            const script3 = manager.getScript();
            expect(script3).toMatchInlineSnapshot(`"_FS_.m(new Map([["v2",{"foo":"bar"}]]));"`);
        });

        describe("with given flow", () => {
            it("should return hydration script", () => {
                const flow2 = createFlow(0);
                const manager = createFlowHydrationManager();
                manager.register("v1", flow, "foo");
                manager.register("v2", flow2, 42);

                const script1 = manager.getScript(flow2);
                expect(script1).toMatchInlineSnapshot(
                    `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v2",42]]));"`,
                );

                const script2 = manager.getScript(flow2);
                expect(script2).toBeNull();

                manager.register("v1", flow, "bar");
                const script3 = manager.getScript(flow2);
                expect(script3).toBeNull();

                manager.register("v2", flow2, 108);
                const script4 = manager.getScript(flow2);
                expect(script4).toMatchInlineSnapshot(`"_FS_.m(new Map([["v2",108]]));"`);
            });

            it("should dedupe same hook with same value in same chunk", () => {
                const flow2 = createFlow(0);
                const manager = createFlowHydrationManager();
                manager.register("v1", flow, "foo");
                manager.register("v2", flow2, 42);
                manager.register("v2", flow2, 42);

                const script1 = manager.getScript(flow2);
                expect(script1).toMatchInlineSnapshot(
                    `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v2",42]]));"`,
                );

                const script2 = manager.getScript(flow2);
                expect(script2).toBeNull();

                manager.register("v1", flow, "bar");
                const script3 = manager.getScript(flow2);
                expect(script3).toBeNull();

                manager.register("v2", flow2, 108);
                const script4 = manager.getScript(flow2);
                expect(script4).toMatchInlineSnapshot(`"_FS_.m(new Map([["v2",108]]));"`);
            });

            it("should dedupe same hook with same value in different chunks", () => {
                const flow2 = createFlow(0);
                const manager = createFlowHydrationManager();
                manager.register("v1", flow, "foo");
                manager.register("v2", flow2, 42);

                const script1 = manager.getScript(flow2);
                expect(script1).toMatchInlineSnapshot(
                    `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v2",42]]));"`,
                );

                manager.register("v2", flow2, 42);
                const script2 = manager.getScript(flow2);
                expect(script2).toBeNull();

                manager.register("v1", flow, "bar");
                const script3 = manager.getScript(flow2);
                expect(script3).toBeNull();

                manager.register("v2", flow2, 108);
                const script4 = manager.getScript(flow2);
                expect(script4).toMatchInlineSnapshot(`"_FS_.m(new Map([["v2",108]]));"`);
            });

            it("should dedupe multiple hooks with same value in same chunk", () => {
                const flow2 = createFlow(0);
                const manager = createFlowHydrationManager();
                manager.register("v1", flow, "foo");
                manager.register("v2", flow2, 42);
                manager.register("v3", flow2, 42);

                const script = manager.getScript(flow2);
                expect(script).toMatchInlineSnapshot(
                    `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v2",42]]));_FS_.d([["v2","v3"]]);"`,
                );

                const script2 = manager.getScript(flow2);
                expect(script2).toBeNull();
            });

            it("should dedupe multiple hooks with same value in different chunks", () => {
                const flow2 = createFlow(0);
                const manager = createFlowHydrationManager();
                manager.register("v1", flow, "foo");
                manager.register("v2", flow2, 42);
                manager.register("v3", flow2, 108);

                const script1 = manager.getScript(flow2);
                expect(script1).toMatchInlineSnapshot(
                    `"(()=>{var c,n,w=self,s='_FS_';w[s]||(w[s]=new Map);c=c=>{(n=document.currentScript)&&n.remove()};w[s].m=r=>{for(var[k,v]of r)w[s].set(k,v);c()};w[s].d=r=>{for(var[f,t]of r)w[s].set(t,w[s].get(f));c()}})();_FS_.m(new Map([["v2",42],["v3",108]]));"`,
                );

                manager.register("v2", flow2, 108);
                const script2 = manager.getScript(flow2);
                expect(script2).toMatchInlineSnapshot(`"_FS_.d([["v3","v2"]]);"`);
            });
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
