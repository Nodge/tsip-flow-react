import { defineConfig } from "tsup";

export default defineConfig([
    {
        entry: ["src/index.ts"],
        format: ["esm", "cjs"],
        target: "es2020",
        splitting: false,
        dts: { resolve: true },
        sourcemap: true,
        clean: true,
        treeshake: true,
    },
    {
        entry: ["src/server.ts"],
        format: ["esm", "cjs"],
        target: "es2020",
        splitting: false,
        dts: { resolve: true },
        sourcemap: true,
        clean: true,
        treeshake: true,
    },
]);
