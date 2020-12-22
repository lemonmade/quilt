import {useHttpAction} from './http-action';

export function useResponseHeader(header: string, value: string) {
  useHttpAction((network) => network.setHeader(header, value));
}
