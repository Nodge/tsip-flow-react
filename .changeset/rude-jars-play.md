---
"@tsip/flow-react": minor
---

Refactor `useAsyncFlow` to eliminate Rules of Hooks violations while maintaining parallel async flow loading capabilities.

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
