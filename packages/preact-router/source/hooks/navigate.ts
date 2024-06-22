import {RouterContext} from '../context.ts';

export function useNavigate() {
  return RouterContext.use().navigate;
}
