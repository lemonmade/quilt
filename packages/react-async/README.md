# `@quilted/react-async`

```tsx
import {useAsync} from '@quilted/react-async';

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
import {useAsyncModule, AsyncModule} from '@quilted/react-async';

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
  if (asyncModule.status !== 'fulfilled') {
    return <button onClick={() => asyncModule.import()}>Load it!</button>;
  }

  const {moduleMethod} = asyncModule.imported!;

  return <DataDisplay data={moduleMethod()} />;
}
```

```tsx
import {
  AsyncModule,
  AsyncComponent,
  createAsyncComponent,
} from '@quilted/react-async';

const module = new AsyncModule(() => import('./MyComponent.tsx'));

<AsyncComponent
  module={module}
  render={({default: Component}) => <Component />}
/>;

const MyComponent = createAsyncComponent(module, {
  renderLoading: <LoadingSpinner />,
});

<MyComponent />;
```
