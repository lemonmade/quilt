# `@quilted/react-async`

```ts
import {useAsync} from '@quilted/react-async';

function MyComponent() {
  const result = useAsync(
    async () => {
      const response = await fetch('https://api.example.com/data');
      return response.json();
    },
    {
      suspense: true,
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
