import {useBrowserDetails} from '../context.ts';

export const useBrowserRequest = () => useBrowserDetails().request;
