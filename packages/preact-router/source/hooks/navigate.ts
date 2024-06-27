import type {Router} from '../Router.ts';
import {RouterContext} from '../context.ts';

export function useNavigate(): Router['navigate'] {
  return RouterContext.use().navigate;
}
