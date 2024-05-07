# `@quilted/react-testing`

> Docs are still a work in progress!

A library for testing React components with a focus on type safety and clear component boundaries.

## Table of contents

- [Installation](#installation)
- [Usage](#usage)
  - [DOM](#dom)
  - [Test structure](#test-structure)
  - [Matchers](#matchers)
  - [API](#api)
    - [`render()`](#render)
    - [`createRender()`](#createRender)
    - [`render.hook()`](#renderHook)
    - [`destroyAll()`](#destroyAll)
    - [`Root`](#root)
    - [`Node`](#element)
    - [`debug()`](#debug)
    - ['toHaveReactProps()'](#toHaveReactProps)
    - ['toHaveReactDataProps()'](#toHaveReactDataProps)
    - ['toContainReactComponent()'](#toContainReactComponent)
    - ['toContainReactComponentTimes()'](#toContainReactComponentTimes)
    - ['toProvideReactContext()'](#toProvideReactContext)
    - ['toContainReactText()'](#toContainReactText)
    - ['toContainReactHTML()'](#toContainReactHTML)
- [FAQ](#faq)

## Installation

```bash
$ yarn add @quilted/react-testing
```

## Usage

This library supports testing React components in a number of different environments. The base `@quilted/react-testing` entry provides the [testing API](#api) built on top of [react-test-renderer](https://reactjs.org/docs/test-renderer.html). This version of the library can work with any React renderer, as the components are testable with just Node.

```tsx
import {render} from '@quilted/react-testing';

function PayNowButton({onPay}) {
  return <button onClick={onPay}>Pay</button>;
}

const pay = () => {};

// "Renders" our component, running all initial lifecycle events
const payNowButton = render(<PayNowButton onPay={pay} />);

// Calls our pay() function
payNowButton.find('button').trigger('onClick');
```

### DOM

The utilities show above work great for most React components. However, projects using `react-dom` can benefit from additional, DOM-related APIs by using the exports from `@quilted/react-testing/dom` instead. This library exposes an identical API to that of `@quilted/react-testing`, but adds additional properties and methods to the test objects to support more elegant assertions related to the actual DOM output of your components. These additional APIs are documented in the [API section](#api).

This version of the library renders the components into the DOM. This means that you can test components that have DOM side effects. It also means that you must ensure the DOM globals are available, typically by using a test runner’s integration with libraries like [jsdom](https://github.com/jsdom/jsdom)).

```tsx
import {render} from '@quilted/react-testing/dom';

function PayNowButton({onPay}) {
  return <button onClick={onPay}>Pay</button>;
}

const payNowButton = render(<PayNowButton onPay={pay} />);
const expectedContent = payNowButton.html.includes('<button>Pay</button>');
```

### Test Structure

A test using `@quilted/react-testing` tends to have the following structure:

- [`render`](#render) your component with some props to get a "root" node
- Optionally, perform some mutation, typically by invoking a rendered component’s props with [`trigger`](#trigger)
- Make assertions based on the root, made easier with the library’s [custom matchers](#matchers)

The following example shows these steps in practice. This example uses [jest](https://jestjs.io/) as a test runner.

```tsx
import {render} from '@quilted/react-testing';
import ClickCounter from './ClickCounter.tsx';

describe('<ClickCounter />', () => {
  it('triggers handlers', () => {
    const clickCounter = render(<ClickCounter defaultCount={0} />);
    clickCounter.find('button').trigger('onClick');
    clickCounter.find('button').trigger('onClick');
    expect(clickCounter.text).toBe('count: 2');
  });
});
```

### Matchers

This library ships with a few useful custom matchers for Jest. To include these matchers, import `@quilted/react-testing/matchers` in any file that is included as part of the `setupFilesAfterEnv` option passed to Jest.

```tsx
import '@quilted/react-testing/matchers';
import {destroyAll} from '@quilted/react-testing';

afterEach(() => {
  destroyAll();
});
```

This will allow you to use matchers such as [`toContainReactText`](#toContainReactText) or [`toContainReactComponent`](#toContainReactComponent) on your tree.

```tsx
import {render} from '@quilted/react-testing';
import ClickCounter from './ClickCounter.tsx';
import LinkComponent from './LinkComponent.tsx';

describe('<ClickCounter />', () => {
  it('renders a link to a cool website', () => {
    const clickCounter = render(<ClickCounter defaultCount={0} />);
    expect(wrapper).toContainReactComponent(LinkComponent, {
      to: 'https://www.cool-website.com',
    });
  });

  it('triggers handlers', () => {
    const clickCounter = render(<ClickCounter defaultCount={0} />);
    clickCounter.find('button').trigger('onClick');
    clickCounter.find('button').trigger('onClick');
    expect(clickCounter).toContainReactText('count: 2');
  });
});
```

Additionally, this library provides DOM-specific matchers, like [`toContainReactHTML`](#toContainReactHTML), from the `@quilted/react-testing/dom-matchers` entrypoint.

```tsx
import '@quilted/react-testing/matchers';
import '@quilted/react-testing/dom-matchers';

// In a test...

const button = render(<Button>Hello!</Button>);
expect(button).toContainReactHTML('<button>Hello!</button>');
```

### API

#### <a name="render"></a> `render(element: ReactElement<any>)`

Renders a component to the DOM and returns a [`Root`](#root) instance. Note that for this to work, you must have a simulated browser environment, such as the `jsdom` environment that Jest uses.

#### <a name="createRender"></a> `createRender<RenderOptions, Context, Actions, Async>(options: CreateRenderOptions<RenderOptions, Context, Actions, Async>): RenderFunction`

The [`render`](#render) function is powerful on its own, but applications will often want a more powerful version tailored to their application. A common example is app-wide context, where a set of context providers are generally assumed to be present for every component under test.

`createRender` enables this kind of customization by vending a custom `render` function that will automatically wrap the component under test in an appropriate test wrapper. This custom render function can do four things:

1. Allow custom options to be passed as the second argument to render, as specified by the `RenderOptions` generic
1. Map passed options to an object containing all the relevant `context` (be it objects passed through react context providers, or other useful values for controlling the test harness), and another object for helpful test `actions`
1. Use the resolved context to render react components around the element under test that use the context
1. Perform some additional resolution after the component has rendered, including asynchronous behavior like resolving initial API results

These features are controlled by the generic type arguments to `createRender`, and the options detailed in the section below. Note that, no matter how many context providers or test wrapper you end up rendering your element within, all of the methods on the returned [`Root`](#root) instance will still be scoped to within the tree actually under test.

##### `context(options: RenderOptions): Context`

Takes an object of options passed by a user of your custom render (or an empty object), and should return an object containing the context you need for the test harness. If your `Context` type has non-optional keys, you **must** provide this option.

##### `render(element: ReactElement, context: Context, options: RenderOptions): ReactElement`

This function is called with the react element under test, the context created by `context()` (or an empty object), and the options passed by the user of your custom render (or an empty object). This function must return a new react element, usually by wrapping the component in context providers.

> **Note:** `render` can be called multiple times for a given component. Your `render` function (and any wrapping elements you put around the element under test) should be able to re-render from calling this function, ideally without unrendering the component under test.

##### `actions(root: CustomRoot, options: RenderOptions): Actions`

Takes the [root node](#root) of the tree and any render options that were provided, and returns an object with any helpers that you need for the test harness.

If your `Action` type has non-optional keys, you **must** provide this option.

##### `afterRender(root: CustomRoot, options: RenderOptions): Promise | void`

This function allows you to perform additional logic after a component has been rendered. It gets called with a special [`Root`](#root) instance that has one additional property: `context`, the object with the context you created in `context()` (or an empty object). You can use this hook to perform some additional resolution after the component has rendered, such as resolving all GraphQL.

If this option returns a `Promise`, the result of calling `render()` will become a promise that resolves to the custom `Root` instance. Otherwise, it will synchronously return the `Root` instance. If you specify the `Async` generic argument as `true`, you **must** pass this option.

##### Extending a custom render function

It is possible to extend a custom render function with additional logic. This can help to provide more focused testing utilities for a section of the application that provides additional context to its subtree. Every function created by `createRender` has an `extend` method. This method has the same type parameters and options as `createRender` itself. When you create an extended render function, your additional options are merged with the original render’s options as follows:

- The resulting `render` function accepts the merged set of allowed options.
- The root created by the resulting `render` function has a `context` property that is the merged result of calling the original context and the extended context.
- The `context()` and `render()` options you provide to `render.extend()` will be called with the full, merged set of options.
- The `render()` option provided to `render.extend()` is called **first**. The result of calling this function is then passed to the original `render()`.
- The `afterRender()` option provided to `render.extend()` is called **first**. If it returns a promise, the resulting post-render process will wait for it to resolve, and will then return the result of calling the original `afterRender()`. If either the original options or the extended options return a promise from `afterRender`, the resulting render function will be asynchronous.

Additionally, a new option is available for `extend()`: you can provide an `options` callback that receives as an argument the merged set of options, and must return a partial subset of those options to use as overrides. This can be used to extend a render function and provide default values for some options that do not otherwise have defaults, or to customize base options on the basis of your newly-added options.

```tsx
import {createRender} from '@quilted/react-testing';

interface Options {
  pathname: string;
}

interface ExtendedOptions {
  graphQLResult: object;
}

const render = createRender<Options, Options>({
  context: (options) => options,
  render: (element, {pathname}) => (
    <Router pathname={pathname}>{element}</Router>
  ),
});

const extendedRender = render.extend<ExtendedOptions, ExtendedOptions>({
  context: (options) => options,
  render: (element, {graphQLResult}) => (
    <GraphQLMock mock={graphQLResult}>{element}</GraphQLMock>
  ),
});

const rendered = extendedRender(<MyComponent />, {
  pathname: '/',
  graphQLResult: {},
});

// The final structure of this wrapper is:
// <Router><GraphQLMock><MyComponent /></GraphQLMock></Router>
//
// It also has a context field that merged the two `context()`
// results: typeof rendered.context === {pathname: string; graphQLResult: object}
```

#### <a name="renderHook"></a> `render.hook<HookResult>(useHook: HookResult, options?: RenderOptions): HookRunner<HookResult, Context, Actions>`

Whenever possible, you should use test on component boundaries using [`render()`](#render) and the [`Root`](#root) and [`Node`](#node) objects it creates. Sometimes, you might have a particularly complex bit of logic that you encapsulate in a custom hook. Every `render()`, including [custom render functions](#customRender), provide a `hook()` method to run your hook in a simulated component, and to access the current return result of your hook. Below, you can see how we can use this helper to inspect our custom hook’s initial result:

```ts
import {useState} from 'preact/hooks';
import {render} from '@quilted/react-testing';

function useIncrementingNumber(initial: number) {
  const [currentNumber, setCurrentNumber] = useState(initial);
  const incrementNumber = () => setCurrentNumber((current) => current + 1);
  return [currentNumber, incrementNumber];
}

const incrementingNumber = render.hook(() => useIncrementingNumber(5));
incrementingNumber.value[0]; // Our initial number, `5` in this case
```

The returned “hook runner” can do more than just give you access to the hook’s result. You can also simulate actions that use the hook’s result using the `act()` method. After calling `act()`, the `value` property will be updated with the most recent result.

```ts
const incrementingNumber = render.hook(() => useIncrementingNumber(5));

incrementingNumber.act(([currentNumber, incrementNumber]) => {
  incrementNumber();
});

incrementingNumber.value[1]; // It’s `6` now!
```

If the “base” `render` you used was created using `createRender()`, the second argument to its `hook()` method can be any options you could pass as the second argument to `render()` itself. The resulting `hook` runner will also have the same [`context`](#context) and [`actions`](#actions) properties as a rendered component would have. If the base `render` is asynchronous, `hook()` is asynchronous as well.

#### <a name="destroyAll"></a> `destroyAll()`

All rendered components are tracked in-memory. `destroyAll()` forcibly unrenders all rendered components and removes the DOM node used to house them. You should run this after each test that renders a component (this is often done in a global `afterEach` hook).

#### <a name="root"></a> `Root<Props>`

A `Root` object represents a rendered react tree. Most of the properties and methods it exposes are simply forwarded to the [`Node`](#element) instance representing the top-level component you rendered:

- [#children](#children)
- [#descendants](#descendants)
- [#props](#props)
- [#isDOM](#isDOM)
- [#instance](#instance)
- [#domNode](#domNode)
- [#domNodes](#domNodes)
- [#html()](#html)
- [#text()](#text)
- [#is()](#is)
- [#prop()](#prop)
- [#find()](#find)
- [#findAll()](#findAll)
- [#findWhere()](#findWhere)
- [#findAllWhere()](#findAllWhere)
- [#findContext()](#findContext)
- [#trigger()](#trigger)
- [#triggerKeypath()](#triggerKeypath)

This object also has a number of methods that only apply to the root of a component tree:

#### <a name="root-render"></a> `render()`

Re-renders the component to the DOM. If the component is already rendered, this method will throw an error.

##### <a name="unrender"></a> `unrender()`

Unrenders the component from the DOM. If the component is not already rendered, this method will throw an error. This method can be useful for testing side effects that occur in `componentWillUnrender` or `useEffect` hooks.

##### <a name="setProps"></a> `setProps(props: Partial<Props>)`

Allows you to change a subset of the props specified when the component was originally rendered. This can be useful to test behaviour that is only caused by a change in props, such as `getDerivedStateFromProps` or its equivalent `useRef`/ `useState` hook version.

##### <a name="act"></a> `act<T>(action: () => T): T`

Performs an action in the context of a react [`act() block`](https://reactjs.org/docs/test-utils.html#act), then updates the internal representation of the react tree. You **must** use this whenever performing an action that will cause the react tree to set state and re-render, such as simulating event listeners being called. Failing to do so will print a warning, and the react tree will not be updated for subsequent calls to methods such as `find()`.

```tsx
function MyComponent() {
  const [clicked, setClicked] = useState(false);

  useEffect(
    () => {
      const handler = () => setClicked(true);
      document.body.addEventListener('click', handler);
      return () => document.body.removeEventListener('click', handler);
    },
    [setClicked],
  );

  return clicked ? <div>I’ve been clicked!</div> : <div>Nothing yet</div>;
}

const myComponent = render(<MyComponent />);

// If you don’t do this, you’ll see a warning and the subsequent assertion
// will fail
myComponent.act(() => simulateClickOnBody());

expect(myComponent.text()).toContain been clicked!');
```

##### <a name="destroy"></a> `destroy()`

Unrenders the component and removes its associated DOM node. This method ensures that nothing leaks between tests. It is called on all un-destroyed `Root` objects when you call [`destroyAll()`](#destroyAll)

##### <a name="forceUpdate"></a> `forceUpdate()`

Forces the root component to re-render. This can be necessary in some cases where globals change in a way that does not already cause a "natural" react update, but in general, this method should not be necessary.

#### <a name="element"></a> `Node<Props>`

The `Node` object represents a react element in the tree. This element can be a DOM node, custom react component, or one of the many "special" types react creates, such as context providers and consumers. The `Node` object also houses all of the methods that you will use to find rendered subcomponents ([`find`](#find) and friends), get your react tree into the desired state ([`trigger`](#trigger)), and ensure that state is correct ([`props`](#props)).

It is important to understand that the `Node` object is only a snapshot representation of the react tree at one point in time. As soon as you use `trigger` to simulate calling a prop, or [`Root#act`](#act) to commit an arbitrary update, the `Node` should be considered "stale" and discarded.

##### <a name="props"></a> `props: Props`

This getter returns the props for the component.

##### <a name="type"></a> `type: any`

This getter returns the type of component. For DOM nodes, this will be a string representing the rendered DOM element. For custom react components, this will be the react component itself. For all other nodes, this will be `null`.

##### <a name="isDOM"></a> `isDOM: boolean`

> Only available from `@quilted/react-testing/dom` or `@quilted/react-testing/preact`

This getter returns whether the node represents a DOM node.

##### <a name="instance"></a> `instance: any`

This getter returns the instance associated with the component. **Note:** this property technically gives you access to fields like `state` and methods like `setState`, but doing so violates component boundaries and makes for bad tests. If you can avoid it, you should never use this getter. It should be seen only as an escape hatch when it is impossible to perform the update you need with props alone.

##### <a name="children"></a> `children: Node<unknown>[]`

This getter returns an array of the component’s rendered children (`Node`s and `string`s).

##### <a name="descendants"></a> `descendants: Node<unknown>[]`

This getter returns an array of `Node`s or `string`s that represent everything below this component in the React tree.

##### <a name="domNodes"></a> `domNodes: HTMLNode[]`

> Only available from `@quilted/react-testing/dom` or `@quilted/react-testing/preact`

Returns all DOM nodes that are directly rendered by this component (that is, not rendered by descendant components).

##### <a name="domNode"></a> `domNode: HTMLNode | null`

> Only available from `@quilted/react-testing/dom` or `@quilted/react-testing/preact`

Like `domNodes`, but expects only 1 or 0 DOM nodes to be direct children. If more than 1 DOM node is a child, this method throws an error. If no DOM nodes are children, this method returns `null`.

##### <a name="prop"></a> `prop<K extends keyof Props>(key: K): Props[K]`

Returns the current value of the passed prop.

```tsx
function MyComponent({name}: {name: string}) {
  return <div>Hello, {name}!</div>;
}

function Wrapper() {
  return <MyComponent name="Michelle" />;
}

const wrapper = render(<Wrapper />);
expect(wrapper.find(MyComponent).prop('name')).toBe('Michelle');

// Will give you a type error
expect(wrapper.find(MyComponent).prop('firstName')).toBe('Uhh');
```

##### <a name="text"></a> `text: string`

Returns the text content of the component. In the default `@quilted/react-testing` version of the library, this is the result of concatenating together all React text elements in the tree. In the DOM testing libraries, this is the string of text you would receive from mapping over each DOM node rendered as a descendant of this component and taking its `textContent`.

##### <a name="html"></a> `html: string`

> Only available from `@quilted/react-testing/dom` or `@quilted/react-testing/preact`

Returns the HTML content of the component. This is the string of text you would receive from mapping over each DOM node rendered as a descendant of this component and taking its `innerHTML`.

##### <a name="is"></a> `is(type: Type): this is Node<PropsForComponent<Type>>`

Returns a boolean indicating whether the component type matches the passed type. This function also serves as a type guard, so subsequent calls to values like `props` will be typed as the prop type of the passed component.

```tsx
function MyComponent({name}: {name: string}) {
  return <div>Hello, {name}!</div>;
}

function isMatch(element: Node<unknown>) {
  // If we omitted element.is here, we would not know whether 'name' was a prop,
  // so we would get a type error.
  return element.is(MyComponent) && element.prop('name') === 'Chris';
}
```

##### <a name="find"></a> `find(type: Type, props?: Partial<PropsForComponent<Type>>): Node<PropsForComponent<Type>> | null`

Finds a descendant component that matches `type`, where `type` is either a string or react component. If no matching element is found, `null` is returned. If a match is found, the returned `Node` will have the correct prop typing, which provides excellent type safety while navigating the react tree.

```tsx
function MyComponent({name}: {name: string}) {
  return <div>Hello, {name}!</div>;
}

function YourComponent() {
  return <div>Goodbye, friend!</div>;
}

function Wrapper() {
  return <MyComponent name="Michelle" />;
}

const wrapper = render(<Wrapper />);
expect(wrapper.find(MyComponent)).not.toBeNull();
expect(wrapper.find(YourComponent)).toBe(null);
```

You can optionally pass a second argument to this function, which is a set of props that will be used to further filter the matching elements. These props will be shallow compared to the props of each element.

```tsx
function MyComponent({name}: {name: string}) {
  return <div>Hello, {name}!</div>;
}

function YourComponent() {
  return <div>Goodbye, friend!</div>;
}

function Wrapper() {
  return (
    <>
      <MyComponent name="Michelle" />
      <MyComponent name="Gord" />
    </>
  );
}

const wrapper = render(<Wrapper />);
expect(wrapper.find(MyComponent, {name: 'Gord'})!.props).toMatchObject({
  name: 'Gord',
});
```

##### <a name="findAll"></a> `findAll(type: Type, props?: Partial<PropsForComponent<Type>>): Node<PropsForComponent<Type>>[]`

Like `find()`, but returns all matches as an array.

##### <a name="findWhere"></a> `findWhere(predicate: (element: Node<unknown>) => boolean): Node<unknown> | null`

Finds the first descendant component matching the passed function. The function is called with each `Node` from [`descendants`](#descendants) until a match is found. If no match is found, `null` is returned.

##### <a name="findAllWhere"></a> `findAllWhere(predicate: (element: Node<unknown>) => boolean): Node<unknown>[]`

Like `findWhere`, but returns all matches as an array.

##### <a name="findContext"></a> `findContext(context: Context<Type>): Type | undefined`

Finds the `value` of the first descendant provider for the pass context. If no matching context is found, `undefined` is returned.

Most tests looking for context are probably better served by using the [`.toProvideReactContext`](#toProvideReactContext) matcher. However, it is sometimes useful to grab the context value directly. In particular, if your context object is "smart" — that is, it has methods, and is not just data — you may want to grab the context object to call its functions.

```tsx
const AuthContext = createContext<{logout(): void} | null>(null);

const auth = {
  logout() {
    /* log out! */
  },
};

function MyComponent({children}) {
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

const myComponent = render(<MyComponent />);
myComponent.findContext(AuthContext)!.logout();

/* expect some outcomes from having called .logout() */
```

Note that, if your context provider can provide `undefined`, getting `undefined` back from this function doesn't mean that no context providers were found; to determine the presence of any context providers, you can use [`.find(Context.Provider)](#find) instead.

##### <a name="trigger"></a> `trigger<K extends FunctionKeys<Props>>(prop: K, ...args: Arguments<Props<K>>): ReturnType<Props<K>>`

Simulates a function prop being called on your component. This is usually the key to effective tests: after you have rendered your component, you simulate a change in a subcomponent, and assert that the resulting react tree is in the expected shape. This method automatically uses [`Root#act`](#act) when calling the prop, so updates will automatically be applied to the root component.

When you pass a key that is a prop on your component with a function type, this function will ensure that you pass arguments that are deeply partial versions of the types the prop expects. This allows you to, for example, pass an event object with only a few properties set to a `button`’s `onClick` prop. `trigger` returns whatever the result was of calling the prop.

```tsx
import {useState} from 'preact/hooks';

function MyComponent({onClick}: {onClick(id: string): void}) {
  return (
    <button type="button" onClick={() => onClick(String(Math.random()))}>
      Click me!
    </button>
  );
}

function Wrapper() {
  const [id, setId] = useState('');

  return (
    <>
      <MyComponent onClick={setId} />
      <div>Current id is: {id}</div>
    </>
  );
}

const wrapper = render(<Wrapper />);
wrapper.find(MyComponent)!.trigger('onClick', 'some-id');
expect(wrapper.find('div')!.text()).toContain('some-id');
```

##### <a name="triggerKeypath"></a> `triggerKeypath<T>(keypath: string, ...args: any[]): T`

Like `trigger()`, but allows you to provide a keypath referencing nested objects instead. Note that limitations in TypeScript prevent the same kind of type-safety as `trigger` guarantees.

```tsx
function MyComponent({action}: {action: {onAction(): void; label: string}}) {
  return (
    <button type="button" onClick={action.onAction}>
      {action.label}
    </button>
  );
}

const spy = jest.fn();
const myComponent = render(
  <MyComponent action={{label: 'Hi', onAction: spy}} />,
);
myComponent.triggerKeypath('action.onAction');
expect(spy).toHaveBeenCalled();
```

#### <a name="debug"></a> `debug(options?: {allProps?: boolean, depth?: number, verbosity?: number}): string`

Returns a text representation of either the root node, or any element within the rendered graph. `debug()` output can be tweaked using the `options` parameter.

- `allProps` overrides the default props filtering behaviour and instead includes all props in the output, by default `className`, `aria-*`, and `data-*` props are omitted.
- `depth` defines the number of children printed, by default all children are printed.
- `verbosity` defines the level of expansion that non-scalar props experience, the default value of `1` will expand objects one level deep

Typical usage should not require providing any options as the default `verbosity` and `depth` should be appropriate for the majority of inspections.

```tsx
function ObjectText({data}: {data: {}}) {
  return <span>{JSON.stringify(data)}</span>;
}

function Container({children}: PropsWithChildren<{}>) {
  return children;
}

function MyComponent({onClick}: {onClick(id: string): void}) {
  return (
    <Container>
      <button type="button" onClick={() => onClick(String(Math.random()))}>
        <ObjectText data={{a: {very: {deep: {data: {object: 'with text'}}}}}} />
      </button>
    </Container>
  );
}

const wrapper = render(<MyComponent />);
// print the whole structure with one level of prop verbosity
console.log(wrapper.debug());
// print only the Container and button without any other children
console.log(wrapper.find(Container)!.debug({depth: 1}));
// find button by name and print all children with verbose props details
console.log(
  wrapper
    .findWhere((type) => type && type.name === 'button')!
    .debug({verbosity: 9}),
);
```

#### <a name="toHaveReactProps"></a> `.toHaveReactProps(props: object)`

Checks whether a `Root` or `Node` object has specified props (asymmetric matchers like `expect.objectContaining` are fully supported). Strict type checking is enforced, so the `props` you pass must be a valid subset of the actual props for the component.

```tsx
const myComponent = render(<MyComponent />);

expect(myComponent.find('div')).toHaveReactProps({'aria-label': 'Hello world'});
expect(myComponent.find('div')).toHaveReactProps({
  onClick: expect.any(Function),
});
```

#### <a name="toHaveReactDataProps"></a> `.toHaveReactDataProps(data: object)`

> Only available from `@quilted/react-testing/dom-matchers`

Like `.toHaveReactProps()`, but is not strictly typed. This makes it more suitable for asserting on `data-` attributes, which can’t be strongly typed.

```tsx
const myComponent = render(<MyComponent />);

expect(myComponent.find('div')).toHaveReactDataProps({
  'data-message': 'Hello world',
});
```

#### <a name="toContainReactComponent"></a> `.toContainReactComponent(type: string | ComponentType, props?: object)`

Asserts that at least one component matching `type` is in the descendants of the passed node. If the second argument is passed, this expectation will further filter the matches by components whose props are equal to the passed object (again, asymmetric matchers are fully supported).

```tsx
const myComponent = render(<MyComponent />);

expect(myComponent).toContainReactComponent('div', {
  'aria-label': 'Hello world',
  onClick: expect.any(Function),
});
```

#### <a name="toContainReactComponentTimes"></a> `.toContainReactComponentTimes(type: string | ComponentType, times: number, props?: object)`

Asserts that a component matching `type` is in the descendants of the passed node a number of times. If the third argument is passed, this expectation will further filter the matches by components whose props are equal to the passed object (again, asymmetric matchers are fully supported). To assert that one component is or is not the descendant of the passed node use `.toContainReactComponent` or `.not.toContainReactComponent`.

```tsx
const myComponent = render(<MyComponent />);

expect(myComponent).toContainReactComponentTimes('div', 5, {
  'aria-label': 'Hello world',
});
```

#### <a name="toProvideReactContext"></a> `.toProvideReactContext<T>(context: Context<T>, value?: T)`

Asserts that at least one `context.Provider` is in the descendants of the passed node. If the second argument is passed, this expectation will further filter the matches by providers whose value is equal to the passed object (again, asymmetric matchers are fully supported).

```tsx
import {createContext} from 'preact';

const MyContext = createContext({hello: 'world'});

function MyComponent({children}) {
  return (
    <MyContext.Provider value={{hello: 'Winston!'}}>
      {children}
    </MyContext.Provider>
  );
}

const myComponent = render(<MyComponent />);

expect(myComponent).toProvideReactContext(MyContext, {
  hello: expect.any(String),
});
```

#### <a name="toContainReactText"></a> `.toContainReactText(text: string)`

Asserts that the rendered output of the component contains the passed string as text content (that is, the text is included in what you would get by calling `textContent` on all root DOM nodes rendered by the component).

```tsx
const myComponent = render(<MyComponent />);
expect(myComponent).toContainReactText('Hello world!');
```

#### <a name="toContainReactHTML"></a> `.toContainReactHTML(text: string)`

> Only available from `@quilted/react-testing/dom-matchers`

Asserts that the rendered output of the component contains the passed string as HTML (that is, the text is included in what you would get by calling `outerHTML` on all root DOM nodes rendered by the component).

```tsx
const myComponent = render(<MyComponent />);
expect(myComponent).toContainReactHTML('<span>Hello world!</span>');
```

## FAQ

### Why not use [Enzyme](https://airbnb.io/enzyme/) instead?

Enzyme is a very popular testing library that heavily inspired the approach this library takes. However, our experience with Enzyme has not been ideal:

- It has frequently taken a long time to support new react features.
- It has a very large API surface area, much of which does not conform to Shopify’s [testing conventions](https://github.com/Shopify/web-foundation/blob/master/handbook/Best%20practices/React/Testing.md). For example, Enzyme provides APIs like `setState` which encourage reaching in to implementation details of your components.
- Enzyme is unlikely to add features we use or need in a testing library, such as automatic unrendering and a built-in version `trigger()`.

### Why not use [react-testing-library](https://github.com/testing-library/react-testing-library) instead?

While the premise of writing tests that mirror user actions is compelling, basing all tests off the raw DOM being produced becomes unmanageable for larger apps.

### Does this library work with Preact?

We currently provide support for Preact applications via a [separate package](https://github.com/Shopify/preact-testing). This may change in the future.
