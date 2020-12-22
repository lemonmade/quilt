import type {CspDirective} from '@quilted/http';
import {useHttpAction} from './http-action';

export function useResponseCspDirective(
  directive: CspDirective,
  source: string | string[] | boolean,
) {
  useHttpAction((network) => network.addCspDirective(directive, source));
}
