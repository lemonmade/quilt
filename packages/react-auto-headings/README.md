# `@quilted/react-auto-headings`

[![Build Status](https://travis-ci.org/Shopify/quilt.svg?branch=master)](https://travis-ci.org/Shopify/quilt) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md) [![npm version](https://badge.fury.io/js/%40shopify%2Freact-router.svg)](https://badge.fury.io/js/%40shopify%2Freact-router)

A set of components for automatically incrementing heading levels based on React context. These components help you create an accessible document outline in a complex web application without the headache.

## Installation

```bash
$ yarn add @quilted/react-auto-headings
```

## Usage

There are two key components exported by this library. `AutoHeadingGroup` creates a nested heading context, which increments all headings inside that component by one relative to their surrounding context. `AutoHeading` uses that context to render a the right heading element based on context.

```tsx
import {AutoHeading, AutoHeadingGroup} from '@quilted/react-auto-headings';

export function App() {
  return (
    <AutoHeadingGroup>
      <AutoHeading>
        This will be an <code>h1</code>
      </AutoHeading>
      <AutoHeadingGroup>
        <AutoHeading>
          This will be an <code>h2</code>
        </AutoHeading>
        <p>Some content</p>
        <AutoHeading>
          This will be another <code>h2</code>
        </AutoHeading>
        <p>Some more content</p>
      </AutoHeadingGroup>
    </AutoHeadingGroup>
  );
}
```

The `AutoHeading` component will use a `p` element instead of a heading if it is not nested in an `AutoHeadingGroup`, or if you pass the `accessibilityRole="presentation"` prop.

```tsx
import {AutoHeading, AutoHeadingGroup} from '@quilted/react-auto-headings';

export function App() {
  return (
    <>
      <AutoHeading>
        This will be a <code>p</code>
      </AutoHeading>
      <AutoHeadingGroup>
        <AutoHeading accessibilityRole="presentation">
          This will also be a <code>p</code>
        </AutoHeading>
      </AutoHeadingGroup>
    </>
  );
}
```

The `AutoHeading` also accepts all props accepted by a `p` or `hx` tag. This makes it easy to compose this component inside heading elements of a component library, as you can rely on these components to maintain document structure while passing all the properties you need to the rendered DOM elements.

```tsx
import {AutoHeading, AutoHeadingGroup} from '@quilted/react-auto-headings';
import styles from './Heading.css';

export function Heading({children}) {
  return <AutoHeading className={styles.Heading}>{children}</AutoHeading>;
}

export function Subheading({children}) {
  return <AutoHeading className={styles.Subheading}>{children}</AutoHeading>;
}

export function App() {
  return (
    <AutoHeadingGroup>
      <Subheading>
        Subheading first is probably bad design-wise, but at least accessibility
        is maintained: this will be an <code>h1</code>!
      </Subheading>
      <AutoHeadingGroup>
        <Heading>
          This will look weird, but it’s an (accessible) <code>h2</code>
        </Heading>
      </AutoHeadingGroup>
    </AutoHeadingGroup>
  );
}
```

If you want to use the current heading level for your own purposes, you can access it with the `useAutoHeadingLevel()` hook. Keep in mind that this value can be `undefined`, as your component may not have any `AutoHeadingGroup` ancestor.

```tsx
import {useAutoHeadingLevel} from '@quilted/react-auto-headings';

export function CustomHeading({children}) {
  const level = useHeadingLevel();
  const Element = level ? `h${level}` : 'p';
  return <Element>{children}</Element>;
}
```

If you need the document outline to start at a different heading level, you can use the `level` prop on `AutoHeadingGroup`. If you try to set the heading level to a "higher" heading level (e.g., from heading level `2` to heading level `1`), the component will throw an error.

```tsx
import {AutoHeading, AutoHeadingGroup} from '@quilted/react-auto-headings';

export function App() {
  return (
    <AutoHeadingGroup level={3}>
      <AutoHeading>
        This will be an <code>h3</code>
      </AutoHeading>
    </AutoHeadingGroup>
  );
}
```
