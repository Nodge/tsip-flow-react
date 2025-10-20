# @tsip/flow-react

## 0.2.0

### Minor Changes

- [#2](https://github.com/Nodge/tsip-flow-react/pull/2) [`cf7b12e`](https://github.com/Nodge/tsip-flow-react/commit/cf7b12e476e38f622e15863717c38fb6584d5734) Thanks [@Nodge](https://github.com/Nodge)! - Refactor `useAsyncFlow` to eliminate Rules of Hooks violations while maintaining parallel async flow loading capabilities.

  **Breaking Changes:**
  - Removed `useAsyncFlows` hook - parallel loading is now handled within `useAsyncFlow`
  - Changed `useAsyncFlow` return type from object to tuple `[data, state]` where `data()` throws promises/errors for Suspense/ErrorBoundary
  - Removed `suspense` and `errorBoundary` options from `useAsyncFlow` - Suspense and ErrorBoundary are now always enabled. Manual loading/error state handling is available via the returned state object

  **Migration Guide:**

  Before:

  ```tsx
  // With suspense
  const { data } = useAsyncFlow(flow);
  return <div>{data}</div>;

  // Without suspense
  const { data, isLoading } = useAsyncFlow(flow, { suspense: false });
  if (isLoading) return <div>loading...</div>;
  return <div>{data}</div>;

  // Parallel async operations
  const [user, posts] = useAsyncFlows([userFlow, postsFlow]);
  return <Dashboard user={user} posts={posts} />;
  ```

  After:

  ```tsx
  // With suspense
  const [data] = useAsyncFlow(flow);
  return <div>{data()}</div>;

  // Without suspense
  const [data, { isLoading }] = useAsyncFlow(flow);
  if (isLoading) return <div>loading...</div>;
  return <div>{data()}</div>;

  // Parallel async operations
  const [user] = useAsyncFlow(userFlow);
  const [posts] = useAsyncFlow(postsFlow);
  return <Dashboard user={user()} posts={posts()} />;
  ```

## 0.1.1

### Patch Changes

- [#3](https://github.com/Nodge/tsip-flow-react/pull/3) [`6f4588b`](https://github.com/Nodge/tsip-flow-react/commit/6f4588bfe7b6ba5c18a20d4cf1c66a8aed40dda6) Thanks [@Nodge](https://github.com/Nodge)! - Fix TypeScript declaration file generation by enabling DTS resolution in tsup config. This removes the dependency on the `@tsip/types` package.

## 0.1.0

### Minor Changes

- [`c97db8f`](https://github.com/Nodge/tsip-flow-react/commit/c97db8f2532a51e20abd52874188f18063bc77ce) Thanks [@Nodge](https://github.com/Nodge)! - Initial release of @tsip/flow-react - React hooks and utilities for integrating TSIP reactive data flows.
