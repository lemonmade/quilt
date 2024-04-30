import {useBrowserDetails} from '../context.ts';

export const useInitialURL = () => useBrowserDetails().initialURL;
