import {
	createElement,
	createRef,
	Component,
	createContext,
	Fragment
} from 'preact';
import {
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue
} from 'preact/hooks';
import { PureComponent } from './PureComponent';
import { memo } from './memo';
import { forwardRef } from './forwardRef';
import { Children } from './Children';
import { Suspense, lazy } from './suspense';
import { SuspenseList } from './suspense-list';
import { createPortal } from './portals';
import {
	hydrate,
	render,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
} from './render';

import {unstable_batchedUpdates} from './batched-updates';
import {cloneElement} from './clone-element';
import {createFactory} from './factory';
import {findDOMNode} from './find-dom-node';
import {StrictMode} from './strict-mode';
import {unmountComponentAtNode} from './unmount';
import {isValidElement} from './valid-element';
import {version} from './version';

// React copies the named exports to the default one.
const React = {
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useRef,
	useImperativeHandle,
	useMemo,
	useCallback,
	useContext,
	useDebugValue,
	version,
	Children,
	render,
	hydrate,
	unmountComponentAtNode,
	createPortal,
	createElement,
	createContext,
	createFactory,
	cloneElement,
	createRef,
	Fragment,
	isValidElement,
	findDOMNode,
	Component,
	PureComponent,
	memo,
	forwardRef,
	unstable_batchedUpdates,
	StrictMode,
	Suspense,
	SuspenseList,
	lazy,
	__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
};

export default React;
