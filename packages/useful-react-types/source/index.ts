import type {PropsWithChildren as ReactPropsWithChildren} from 'react';

/**
 * A type that matches the provided `Props`, but also includes an
 * optional `children` prop.
 */
export type PropsWithChildren<Props = {}> = ReactPropsWithChildren<Props>;
