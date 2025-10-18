# @tsip/flow-react - React Hooks for TSIP Reactive Data Flows

React hooks and utilities for integrating reactive data flows based on the [TypeScript Interface Proposals (TSIP)](https://github.com/Nodge/ts-interface-proposals) into React applications. This library provides hooks for reading both synchronous and asynchronous flows, effects to react to flow changes, and hydration support for SSR.

## Features

- **Standards-Based**: Built on the TypeScript Interface Proposals for seamless compatibility with TSIP-compatible libraries
- **React Integration**: Purpose-built hooks for consuming flows in React components
- **Type-Safe**: Comprehensive TypeScript support with full type inference
- **Lightweight**: Only 1.1KB minified+gzipped
- **Suspense & Error Boundaries**: First-class support for React Suspense and Error Boundaries
- **SSR/SSG Support**: Full server-side rendering and static generation support with hydration

## Installation

```bash
npm install @tsip/flow-react
# or
yarn add @tsip/flow-react
# or
pnpm add @tsip/flow-react
```

## Quick Start

```tsx
import { createFlow } from "@tsip/flow";
import { useFlow } from "@tsip/flow-react";

// Create a reactive counter
const counterFlow = createFlow(0);

function Counter() {
    const count = useFlow(counterFlow);

    return (
        <div>
            <p>Count: {count}</p>
            <button onClick={() => counterFlow.emit(count + 1)}>Increment</button>
        </div>
    );
}
```

## API

### `useFlow<T>(flow: Flow<T>): T`

Subscribes to a Flow and returns its current value. The component will re-render whenever the flow emits a new value.

```tsx
import { createFlow } from "@tsip/flow";
import { useFlow } from "@tsip/flow-react";

const messageFlow = createFlow("Hello");

function Message() {
    const message = useFlow(messageFlow);
    return <p>{message}</p>;
}
```

**Conditional Subscription:**

Use `skipToken` to conditionally skip subscription:

```tsx
import { useFlow, skipToken } from "@tsip/flow-react";

function ConditionalMessage({ enabled }: { enabled: boolean }) {
    const message = useFlow(enabled ? messageFlow : skipToken);
    return <p>{message ?? "Disabled"}</p>;
}
```

### `useAsyncFlow<T>(flow: AsyncFlow<T>): UseAsyncFlowResult<T>`

Subscribes to an AsyncFlow and returns its current state. By default, integrates with React Suspense and Error Boundaries.

```tsx
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { createAsyncFlow } from "@tsip/flow";
import { useAsyncFlow } from "@tsip/flow-react";

const userFlow = createAsyncFlow<User>({ status: "pending" });

function App() {
    return (
        <ErrorBoundary fallback={<div>Something went wrong</div>}>
            <Suspense fallback={<div>Loading...</div>}>
                <UserProfile />
            </Suspense>
        </ErrorBoundary>
    );
}

function UserProfile() {
    // Starts loading immediately, subscribes to flow updates
    const [user] = useAsyncFlow(userFlow);

    // The user() call returns data and integrates with Suspense and Error Boundary
    return <div>Welcome, {user().name}!</div>;
}
```

**Without Suspense/Error Boundaries:**

```tsx
function UserProfile() {
    const [user, { isLoading, isError, error }] = useAsyncFlow(userFlow);

    // To opt-out from Suspense you should check isLoading flag before calling the user()
    if (isLoading) return <div>Loading...</div>;

    // To opt-out from Error Boundary you should check isError flag before calling the user()
    if (isError) return <div>Error: {error.message}</div>;

    return <div>Welcome, {user().name}!</div>;
}
```

### `useFlowEffect(flow: Flow<T>, effect: (value: T) => void | (() => void), deps?)`

Runs a side effect whenever a flow emits a new value. Similar to `useEffect`, but triggered by flow changes.

```tsx
import { useFlowEffect } from "@tsip/flow-react";

function Logger() {
    useFlowEffect(counterFlow, (count) => {
        console.log("Counter changed:", count);
    });

    return null;
}
```

## Server-Side Rendering (SSR)

`@tsip/flow-react` provides full SSR support with automatic hydration.

### Server Setup

```tsx
// server.tsx
import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { createFlowHydrationManager } from "@tsip/flow-react/server";
import { FlowHydrationProvider } from "@tsip/flow-react";

app.get("/", (req, res) => {
    const hydrationManager = createFlowHydrationManager();

    const htmlStream = new Writable({
        write(chunk: Buffer, encoding, callback) {
            const script = hydrationManager.getScript();
            if (script) {
                res.write(`<script>${script}</script>`);
            }

            res.write(chunk);
            callback();
        },
        final(callback) {
            res.write("</div></body></html>");
            callback();
        },
    });

    const reactStream = renderToPipeableStream(
        <FlowHydrationProvider manager={hydrationManager}>
            <App />
        </FlowHydrationProvider>,
        {
            bootstrapScriptContent: "self._hydrate?self._hydrate():self._hydrate=1;",
            onShellReady() {
                res.status(200);
                res.set("Content-Type", "text/html");
                res.write("<!DOCTYPE html><html><body><div id='root'>");
                reactStream.pipe(htmlStream);
            },
            onShellError() {
                res.sendStatus(500);
            },
        },
    );

    htmlStream.on("finish", () => res.end());
    htmlStream.on("error", () => res.end());
});
```

### Client Setup

```tsx
// client.tsx
import { hydrateRoot } from "react-dom/client";
import { createFlowHydrationManager } from "@tsip/flow-react";
import { FlowHydrationProvider } from "@tsip/flow-react";

const hydrationManager = createFlowHydrationManager();

hydrateRoot(
    document.getElementById("root")!,
    <FlowHydrationProvider manager={hydrationManager}>
        <App />
    </FlowHydrationProvider>,
);
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT
