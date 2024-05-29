# `@quilted/preact-async`

```tsx
import {useAsync} from '@quilted/preact-async';

function MyComponent() {
  const result = useAsync(
    async () => {
      const response = await fetch('https://api.example.com/data');
      return response.json();
    },
    {
      server: true,
    },
  );

  if (result.pending) {
    return <LoadingSpinner />;
  }

  if (result.error) {
    return <ErrorMessage error={result.error} />;
  }

  return <DataDisplay data={result.value} />;
}
```

```tsx
import {useAsyncModule, AsyncModule} from '@quilted/preact-async';

const asyncModule = new AsyncModule(() => import('./my-module.ts'));

console.log(asyncModule.status);
console.log(asyncModule.imported);
console.log(asyncModule.reason);
console.log(asyncModule.url.href);
const loaded = await asyncModule.import();
const loaded2 = await asyncModule.promise;

function MyComponent() {
  const {moduleMethod} = useAsyncModule(asyncModule);

  return <DataDisplay data={moduleMethod()} />;
}

function MyComponent2() {
  if (asyncModule.status !== 'resolved') {
    return <button onClick={() => asyncModule.import()}>Load it!</button>;
  }

  const {moduleMethod} = asyncModule.imported!;

  return <DataDisplay data={moduleMethod()} />;
}
```

```tsx
import {AsyncModule, AsyncComponent} from '@quilted/preact-async';

const module = new AsyncModule(() => import('./MyComponent.tsx'));

<AsyncComponent
  module={module}
  render={({default: Component}) => <Component />}
/>;

const MyComponent = AsyncComponent.from(module, {
  renderLoading: <LoadingSpinner />,
});

<MyComponent />;
```

## `react-query` APIs to consider

@see https://tanstack.com/query/latest/docs/framework/react/reference/useQuery

### Options

- [x] `queryKey` (as `key`)
- [x] `queryFn` (as `function`)
- [x] `enabled` (as `active`)
- [ ] `networkMode` (no — implement in userland if needed)
- [-] `retry` (with `useAsyncRetry()`)
- [ ] `retryOnMount` (no — use `useAsyncRetry` or a manual `useEffect` instead)
- [ ] `staleTime`
- [ ] `gcTime`
- [ ] `queryKeyHashFn` (no — convert `key` to a string ahead of time if you want this)
- [ ] `refetchInterval`
- [ ] `refetchIntervalInBackground`
- [ ] `refetchOnMount`
- [ ] `refetchOnWindowFocus`
- [ ] `refetchOnReconnect`
- [ ] `notifyOnChangeProps` (no — uses signals for all mutable properties)
- [ ] `select` (no — create a computed signal instead)
- [x] `initialData` (as `cached.value`)
- [x] `initialDataUpdatedAt` (as `cached.time`)
- [ ] `placeholderData` (no — do this in your component instead)
- [ ] `structuralSharing` (no — out of scope)
- [ ] `throwOnError` (no — do this in your component instead)
- [ ] `meta` (no — manually write this to the returned `AsyncAction` instance, since it is directly cached)
- [x] `queryClient` (as `cache`)

### Returns

- [x] `status` (different values, though)
- [x] `isPending` (as `isRunning`)
- [ ] `isSuccess` (no — use `status === 'resolved'` or `value` instead)
- [ ] `isError` (no — use `status === 'rejected'` or `error` instead)
- [ ] `isLoadingError` (no — see `isError`)
- [ ] `isRefetchError` (no — implement in userland if needed)
- [x] `data` (aliased as `value`)
- [ ] `dataUpdatedAt` (TODO as `resolved.updatedAt`)
- [x] `error`
- [x] `errorUpdatedAt` (as `updatedAt`, but only if error was the last result)
- [ ] `failureCount` (no — implement in userland if needed)
- [ ] `failureReason` (no — implement in userland if needed)
- [ ] `isStale`
- [x] `isFetched` (as `hasFinished`)
- [ ] `isFetchedAfterMount` (no — implement in userland if needed)
- [ ] `fetchStatus` (no — implement in userland if needed)
- [ ] `isPaused` (no — implement in userland if needed)
- [ ] `isRefetching` (no — use `isRunning && hasFinished` instead)
- [ ] `isLoading` (no — use `isRunning && !hasFinished` instead)
- [ ] `isInitialLoading` (no — use `isRunning && !hasFinished` instead)
- [ ] `errorUpdateCount` (no — implement in userland if needed)
- [x] `refetch` (as `rerun`)
