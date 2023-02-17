import {createTRPCReact} from '@trpc/react-query';

// Get access to our app’s router type signature, which will
// provide strong typing on the queries and mutations we can
// perform.
import {type AppRouter} from '../../trpc';

export {type AppRouter};

export const trpc = createTRPCReact<AppRouter>();
