import {Environment} from '../../environment';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const {findCurrentFiberUsingSlowPath} = require('react-reconciler/reflection');

// https://github.com/facebook/react/blob/master/packages/shared/ReactWorkTag.js
export enum Tag {
  FunctionComponent = 0,
  ClassComponent = 1,
  IndeterminateComponent = 2,
  HostRoot = 3,
  HostPortal = 4,
  HostComponent = 5,
  HostText = 6,
  Fragment = 7,
  Mode = 8,
  ContextConsumer = 9,
  ContextProvider = 10,
  ForwardRef = 11,
  Profiler = 12,
  SuspenseComponent = 13,
  MemoComponent = 14,
  SimpleMemoComponent = 15,
  LazyComponent = 16,
  IncompleteClassComponent = 17,
  DehydratedSuspenseComponent = 18,
}

export interface Fiber {
  tag: Tag;
  key: null | string;
  elementType: React.ComponentType | string | null;
  type: React.ComponentType | string | null;
  stateNode: any;
  return: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  index: number;
  ref: React.LegacyRef<unknown>;
  pendingProps: unknown;
  memoizedProps: unknown;
  memoizedState: unknown;
}

export interface ReactInstance {
  _reactInternalFiber: Fiber;
}

type Create = Parameters<Environment<any, {}>['update']>[1];
type Child = ReturnType<Create> | string;

export function createNodeFromFiber(element: any, create: Create): Child {
  const fiber: Fiber = findCurrentFiberUsingSlowPath(element);

  if (fiber.tag === Tag.HostText) {
    return fiber.memoizedProps as string;
  }

  const props = {...((fiber.memoizedProps as any) || {})};

  let currentFiber: Fiber | null = fiber.child;
  const allChildren: Child[] = [];

  while (currentFiber != null) {
    const result = createNodeFromFiber(currentFiber, create);
    allChildren.push(result);
    currentFiber = currentFiber.sibling;
  }

  return create<unknown>({
    props,
    type: fiber.type,
    instance: fiber.stateNode,
    children: allChildren.filter((child) => typeof child !== 'string') as any,
  });
}
