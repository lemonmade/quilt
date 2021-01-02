import {Fragment} from 'preact';

/**
 * Strict Mode is not implemented in Preact, so we provide a stand-in for it
 * that just renders its children without imposing any restrictions.
 */
export const StrictMode = Fragment;
