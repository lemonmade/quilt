import type {Navigation} from '../Navigation.ts';
import {useQuiltContext} from '@quilted/preact-context';

export function useNavigate(): Navigation['navigate'] {
  return useQuiltContext('navigation').navigate;
}
