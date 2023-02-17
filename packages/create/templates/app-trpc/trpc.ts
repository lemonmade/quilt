import {initTRPC} from '@trpc/server';

const t = initTRPC.create();

export const appRouter = t.router({
  message: t.procedure
    .input((val: unknown) => {
      if (typeof val === 'string') return val;
      throw new Error(`Invalid input: ${typeof val}`);
    })
    .query(({input}) => `Hello ${input}!`),
});

// Export type router type signature, not the router itself.
// Our client-side code will use this type to infer the
// procedures that are defined.
export type AppRouter = typeof appRouter;
